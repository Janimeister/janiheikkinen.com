import { test, expect } from '@playwright/test';
import { expectAttribution, expectBackLink } from './helpers';

test.describe('Tram map', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('cookie-consent', 'accepted');
      localStorage.setItem('app-language', 'en');
    });
  });

  test('renders the static ASCII map with sea, tracks, stops and a legend', async ({ page }) => {
    await page.goto('/trams');
    await expect(page.locator('h1')).toHaveText('Tram Map');
    await expectBackLink(page);

    const map = page.getByTestId('tram-map');
    await expect(map).toBeVisible();
    await expect(map).toHaveAttribute('role', 'img');
    await expect(map).toHaveAttribute(
      'aria-label',
      /ASCII map of Helsinki with 13 tram lines and \d+ stops/,
    );
    await expect(map.locator('.map-row')).toHaveCount(67);
    await expect(map.locator('.sea').first()).toBeVisible();
    await expect(map.locator('.stop').first()).toBeVisible();
    await expect(map.locator('.line-shared').first()).toBeVisible();
    await expect(map.locator('.label', { hasText: 'KALLIO' })).toBeVisible();
    expect(await map.locator('.map-row').first().textContent()).toHaveLength(140);

    const legend = page.locator('app-glow-card', {
      has: page.getByRole('heading', { name: 'Legend' }),
    });
    await expect(legend.getByRole('listitem', { name: /^Line / })).toHaveCount(13);
    await expect(legend.getByRole('listitem', { name: 'Line 4' })).toHaveText('4');

    await expectAttribution(page, 'https://www.openstreetmap.org/copyright');
    await expectAttribution(page, 'https://www.hsl.fi/en/hsl/open-data');
  });

  test('switches views and character sets', async ({ page }) => {
    await page.goto('/trams');
    const map = page.getByTestId('tram-map');
    await expect(page.getByRole('button', { name: 'City centre' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await page.getByRole('button', { name: 'Whole network' }).click();
    await expect(page.getByRole('button', { name: 'Whole network' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(map.locator('.map-row')).toHaveCount(48);

    await page.getByRole('button', { name: 'Compact' }).click();
    await expect(map.locator('.map-row')).toHaveCount(40);

    await expect(map).not.toContainText('─');
    await page.getByRole('button', { name: 'Unicode' }).click();
    await expect(map).toContainText('─');
  });

  test('starts narrow screens on the compact view, which scrolls instead of shrinking', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/trams');
    await expect(page.getByRole('button', { name: 'Compact' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.getByTestId('tram-map').locator('.map-row')).toHaveCount(40);
    const region = page.getByTestId('tram-map-region');
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    expect(await region.evaluate((el) => el.scrollWidth >= el.clientWidth)).toBe(true);
  });

  test('shows an error when the map data cannot be loaded', async ({ page }) => {
    await page.route('**/data/helsinki-trams.json', (route) => route.fulfill({ status: 500 }));
    await page.goto('/trams');
    await expect(page.locator('p.text-red-400', { hasText: 'Could not load' })).toBeVisible();
  });

  test('is translated into Finnish', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('app-language', 'fi'));
    await page.goto('/trams');
    await expect(page.locator('h1')).toHaveText('Ratikkakartta');
    await expect(page.getByTestId('tram-map')).toHaveAttribute(
      'aria-label',
      /ASCII-kartta Helsingistä/,
    );
  });
});
