import { test, expect, type Locator, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { expectAttribution, expectBackLink } from './helpers';
import { HFP_SAMPLE, HFP_SAMPLE_TRAMS, mockHfpBroker } from './hfp-broker';

async function setUp(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('cookie-consent', 'accepted');
    localStorage.setItem('app-language', 'en');
  });
}

async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(results.violations).toEqual([]);
}

test.describe('Tram map', () => {
  test.beforeEach(async ({ page }) => {
    await setUp(page);
    // Never reach the real broker from tests.
    await mockHfpBroker(page);
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

test.describe('Live trams', () => {
  test.beforeEach(async ({ page }) => setUp(page));

  test('draws trams from the recorded HFP feed, once each despite the 4× copies', async ({
    page,
  }) => {
    const broker = await mockHfpBroker(page, { replay: HFP_SAMPLE });
    await page.goto('/trams');
    await broker.subscribed();

    await expect(page.getByTestId('tram-status')).toHaveText('Live');
    await expect(page.getByTestId('tram-count')).toHaveText(`Trams: ${HFP_SAMPLE_TRAMS}`);
    await expect(page.getByTestId('tram-map')).toHaveAttribute(
      'aria-label',
      new RegExp(`${HFP_SAMPLE_TRAMS} trams on the map\\.$`),
    );
    const overlay = page.getByTestId('tram-overlay');
    await expect(overlay).toHaveAttribute('aria-hidden', 'true');
    await expect(overlay.locator('.tram.line-13').first()).toBeVisible();
    // Trams sharing a spot, as at the Ruskeasuo depot, merge into one marker.
    await expect(overlay.locator('.tram-cluster').first()).toHaveText('*');
    // Raide-Jokeri is in the feed but not on the map.
    await expect(overlay).not.toContainText('15');
  });

  test('dims depot runs', async ({ page }) => {
    // The sample's one depot run, an H line tram heading for Kuusitie.
    const depotRun = HFP_SAMPLE.filter((m) => m.topic.includes('/100HC3/'));
    const broker = await mockHfpBroker(page, { replay: depotRun });
    await page.goto('/trams');
    await broker.subscribed();
    await expect(page.getByTestId('tram-count')).toHaveText('Trams: 1');
    await expect(page.getByTestId('tram-overlay').locator('.tram')).toHaveText('H');
    await expect(page.getByTestId('tram-overlay').locator('.tram')).toHaveClass('tram tram-dim');
  });

  test('connects with the level 0–3 subscription', async ({ page }) => {
    const broker = await mockHfpBroker(page);
    await page.goto('/trams');
    await broker.subscribed();
    expect(broker.subscriptions).toEqual([
      [
        '/hfp/v2/journey/ongoing/vp/tram/+/+/+/+/+/+/+/0/#',
        '/hfp/v2/journey/ongoing/vp/tram/+/+/+/+/+/+/+/1/#',
        '/hfp/v2/journey/ongoing/vp/tram/+/+/+/+/+/+/+/2/#',
        '/hfp/v2/journey/ongoing/vp/tram/+/+/+/+/+/+/+/3/#',
        '/hfp/v2/journey/ongoing/vjout/tram/#',
      ],
    ]);
  });

  test('reconnects when the connection drops', async ({ page }) => {
    const broker = await mockHfpBroker(page, { replay: HFP_SAMPLE });
    await page.goto('/trams');
    await broker.subscribed();
    await expect(page.getByTestId('tram-status')).toHaveText('Live');

    await broker.closeAll();
    await expect(page.getByTestId('tram-status')).toHaveText('Reconnecting…');
    // Trams stay on the map while reconnecting.
    await expect(page.getByTestId('tram-count')).toHaveText(`Trams: ${HFP_SAMPLE_TRAMS}`);
    await broker.subscribed(2);
    await expect(page.getByTestId('tram-status')).toHaveText('Live');
  });

  test('goes offline with the network', async ({ page, context }) => {
    const broker = await mockHfpBroker(page);
    await page.goto('/trams');
    await broker.subscribed();
    await expect(page.getByTestId('tram-status')).toHaveText('Live');

    await context.setOffline(true);
    await expect(page.getByTestId('tram-status')).toHaveText('Offline');
    await context.setOffline(false);
    await expect(page.getByTestId('tram-status')).toHaveText('Live');
  });

  test('has no axe violations with trams on the map', async ({ page }) => {
    const broker = await mockHfpBroker(page, { replay: HFP_SAMPLE });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/trams');
    await broker.subscribed();
    await expect(page.getByTestId('tram-count')).toHaveText(`Trams: ${HFP_SAMPLE_TRAMS}`);
    await expectNoAxeViolations(page);
  });
});

test.describe('Full-screen map', () => {
  test.beforeEach(async ({ page }) => {
    await setUp(page);
    await mockHfpBroker(page, { replay: HFP_SAMPLE });
  });

  test('opens over the page and closes with its button', async ({ page }) => {
    await page.goto('/trams');
    await expect(page.getByTestId('tram-map')).toBeVisible();

    await page.getByRole('button', { name: 'Full screen' }).click();
    const dialog = page.getByRole('dialog', { name: 'Tram map in full screen' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByTestId('tram-map')).toBeVisible();
    await expect(dialog.getByTestId('tram-status')).toHaveText('Live');
    const exit = dialog.getByRole('button', { name: 'Exit full screen' });
    await expect(exit).toBeFocused();

    await exit.click();
    await expect(dialog).toBeHidden();
    await expect(page.getByTestId('tram-map')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Full screen' })).toBeFocused();
  });

  test('closes with Escape', async ({ page }) => {
    await page.goto('/trams');
    await page.getByRole('button', { name: 'Full screen' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
  });

  test('leaves the next page scrollable when navigating away while open', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    await page.goto('/trams');
    await page.getByRole('button', { name: 'Full screen' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.goBack();
    await expect(page.locator('app-hero h1')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('');
    expect(errors).toEqual([]);
  });

  test('keeps keyboard focus inside', async ({ page }) => {
    await page.goto('/trams');
    await page.getByRole('button', { name: 'Full screen' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('button', { name: 'Exit full screen' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(dialog.getByTestId('tram-map-region')).toBeFocused();
    // Past the last control back to the first one (Zoom out is disabled, so it's skipped).
    await page.keyboard.press('Tab');
    await expect(dialog.getByRole('button', { name: 'Zoom in' })).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(dialog.getByTestId('tram-map-region')).toBeFocused();
  });

  test('fills a phone screen, fits the compact map on it and zooms in', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/trams');
    const fontSize = (map: Locator) =>
      map.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    const cardFont = await fontSize(page.getByTestId('tram-map'));

    await page.getByRole('button', { name: 'Full screen' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    expect(await dialog.boundingBox()).toEqual({ x: 0, y: 0, width: 375, height: 812 });
    // The page behind doesn't scroll.
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).toBe(
      'hidden',
    );

    const map = dialog.getByTestId('tram-map');
    await expect(map.locator('.map-row')).toHaveCount(40);
    const region = dialog.getByTestId('tram-map-region');
    await expect
      .poll(() =>
        region.evaluate(
          (el) => el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight,
        ),
      )
      .toBe(true);
    const fittedFont = await fontSize(map);
    expect(fittedFont).toBeGreaterThan(cardFont);

    const zoomOut = dialog.getByRole('button', { name: 'Zoom out' });
    await expect(zoomOut).toBeDisabled();
    await dialog.getByRole('button', { name: 'Zoom in' }).click();
    await expect.poll(() => fontSize(map)).toBeCloseTo(fittedFont * 1.5, 1);
    // Zoomed in, the map pans by scrolling, centred on where it was.
    expect(
      await region.evaluate((el) => el.scrollWidth > el.clientWidth && el.scrollLeft > 0),
    ).toBe(true);
    await zoomOut.click();
    await expect.poll(() => fontSize(map)).toBeCloseTo(fittedFont, 1);

    await dialog.getByRole('button', { name: 'Exit full screen' }).click();
    await expect(dialog).toBeHidden();
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).not.toBe(
      'hidden',
    );
  });

  test('has no axe violations', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/trams');
    await page.getByRole('button', { name: 'Full screen' }).click();
    await expect(page.getByRole('dialog').getByTestId('tram-map')).toBeVisible();
    await expectNoAxeViolations(page);
  });
});
