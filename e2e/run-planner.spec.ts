import { test, expect } from '@playwright/test';

// A fixed clock and zone, so the cheapest window is always the same one.
test.use({ timezoneId: 'Europe/Helsinki' });
const NOW = new Date('2026-10-04T13:05:00+03:00');
const MIDNIGHT = new Date('2026-10-04T00:00:00+03:00').getTime();

/** Two days of 15-minute prices cycling 1…20 c/kWh every five hours, newest first like the API. */
function prices() {
  return Array.from({ length: 192 }, (_, i) => {
    const start = MIDNIGHT + i * 15 * 60_000;
    return {
      price: 1 + (i % 20),
      startDate: new Date(start).toISOString(),
      endDate: new Date(start + 15 * 60_000 - 1).toISOString(),
    };
  }).reverse();
}

test.describe('Electricity: best time to run', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.clock.setFixedTime(NOW);
    await page.addInitScript(() => {
      localStorage.setItem('cookie-consent', 'accepted');
      localStorage.setItem('app-language', 'en');
    });
    await page.route('**/latest-prices.json', (route) =>
      route.fulfill({ json: { prices: prices() } }),
    );
    await page.goto('/electricity');
  });

  test('finds the cheapest start and marks it on the chart', async ({ page }) => {
    const result = page.getByTestId('run-result');
    await expect(result).toContainText('Today 15:00');
    await expect(result).toContainText('ready Today 18:00');
    await expect(result).toContainText('Delay start by 1 h 55 min');
    await expect(page.locator('[data-run]')).toHaveCount(12);
    await expect(page.getByText('Best time to run', { exact: true })).toBeVisible();
  });

  test('switches appliances and keeps the choice after a reload', async ({ page }) => {
    await page.getByRole('button', { name: 'Sauna' }).click();
    await expect(page.getByRole('button', { name: 'Sauna' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.locator('output')).toHaveText('1 h 30 min');
    await expect(page.locator('[data-run]')).toHaveCount(6);

    await page.reload();
    await expect(page.getByRole('button', { name: 'Sauna' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.locator('[data-run]')).toHaveCount(6);
  });

  test('honours a ready-by time', async ({ page }) => {
    const readyBy = page.getByLabel('Ready by (optional)');
    await readyBy.fill('14:00');
    await readyBy.dispatchEvent('change');
    await expect(page.getByTestId('run-result')).toContainText("The run can't finish by then");
    await expect(page.locator('[data-run]')).toHaveCount(0);

    await readyBy.fill('17:00');
    await readyBy.dispatchEvent('change');
    // 14:00–17:00 is the cheapest three hours that end by 17:00.
    await expect(page.getByTestId('run-result')).toContainText('Today 14:00');

    await page.getByRole('button', { name: 'Clear ready-by time' }).click();
    await expect(page.getByTestId('run-result')).toContainText('Today 15:00');
  });

  test('a custom run time and energy clear the appliance choice', async ({ page }) => {
    await page.getByLabel('Run time').fill('4');
    await expect(page.locator('output')).toHaveText('1 h');
    await expect(page.getByRole('button', { name: 'Dishwasher' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    const energy = page.getByLabel('Energy per run');
    await energy.fill('10');
    await energy.dispatchEvent('change');
    await expect(page.getByTestId('run-result')).toContainText('Cost then');
  });
});
