import { expect, failApi, freezeClock, respondWith, test } from './api-mocks';
import { TIME_ZONE } from './fixtures/api-data';
import { expectAttribution, expectBackLink } from './helpers';

// The fixture's day is 12 October 2026 in Helsinki, where the clock is frozen at 13:05.
test.use({ timezoneId: TIME_ZONE });

test.describe('Electricity Page', () => {
  test.beforeEach(async ({ page }) => {
    await freezeClock(page);
  });

  test('has heading, back link and attribution', async ({ page }) => {
    await page.goto('/electricity');
    await expect(page.locator('h1')).toContainText('Electricity Prices');
    await expectBackLink(page);
    await expectAttribution(page, 'https://porssisahko.net');
  });

  test('shows the price for the current quarter hour', async ({ page }) => {
    await page.goto('/electricity');
    const current = page
      .locator('app-glow-card')
      .filter({ has: page.getByRole('heading', { name: 'Current Price' }) });
    await expect(current).toContainText(/13\.00\s*c\/kWh/);
    await expect(current).toContainText('Valid 13:00 – 13:15');
  });

  test("summarises today's prices", async ({ page }) => {
    await page.goto('/electricity');
    const stats = page
      .locator('app-glow-card')
      .filter({ has: page.getByRole('heading', { name: 'Today Stats' }) });
    await expect(stats).toContainText(/Average\s*11\.50 c\/kWh/);
    await expect(stats).toContainText(/Lowest\s*0\.00 c\/kWh/);
    await expect(stats).toContainText(/Highest\s*23\.00 c\/kWh/);
    await expect(stats).toContainText(/Cheapest 15 min\s*00:00–00:15/);
    await expect(stats).toContainText(/Priciest 15 min\s*23:00–23:15/);
  });

  test('lists every quarter hour in time order, even though the API sends newest first', async ({
    page,
  }) => {
    await page.goto('/electricity');
    const table = page.getByRole('region', { name: 'Table of all prices' });
    const rows = table.locator('tbody tr').filter({ hasNot: page.locator('th') });
    await expect(rows).toHaveCount(96);
    await expect(rows.first()).toContainText('00:00');
    await expect(rows.last()).toContainText('23:45');
  });

  test('says so when there is no price for the current time', async ({ page }) => {
    await respondWith(page, 'electricity', { prices: [] });
    await page.goto('/electricity');
    await expect(page.getByText('No current price available')).toBeVisible();
    await expect(page.getByText('No data for today')).toBeVisible();
  });

  test('shows an error card when prices fail to load', async ({ page }) => {
    await failApi(page, 'electricity');
    await page.goto('/electricity');
    await expect(page.locator('p.text-red-400')).toHaveText(
      'Could not load electricity price data. Please try again later.',
    );
  });
});
