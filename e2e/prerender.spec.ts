import type { Page } from '@playwright/test';
import { test, expect, API } from './api-mocks';
import { mockHfpBroker } from './hfp-broker';

// Every page is prerendered to HTML and then taken over by the app ("hydrated"). The dev server
// renders pages the same way on request, so these run against it like every other test.

const PAGES = [
  '/',
  '/weather',
  '/electricity',
  '/trams',
  '/departures',
  '/github',
  '/ascii',
  '/snake',
  '/pet',
  '/sorting',
  '/searching',
  '/pathfinding',
  '/third-party-notices',
  '/fi',
  '/fi/weather',
  '/fi/sorting',
];

/** Holds the app's code back, as on a slow connection, until the returned function is called. */
async function holdApp(page: Page): Promise<() => void> {
  let release = () => {};
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.route(/\/main(-\w+)?\.js(\?.*)?$/, async (route) => {
    await held;
    await route.continue();
  });
  return release;
}

/** Resolves once the app has taken over everything the server rendered. */
async function hydrated(page: Page) {
  // Angular marks what it has yet to take over with `ngh` and removes the mark as it goes.
  await expect(page.locator('[ngh]')).toHaveCount(0);
}

test.describe('Prerendered pages', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('cookie-consent', 'accepted'));
    // Never reach the real tram broker from tests.
    await mockHfpBroker(page);
  });

  test('arrive as HTML with their heading and copy, in the language of the address', async ({
    request,
  }) => {
    const english = await (await request.get('/weather')).text();
    expect(english).toContain('<html lang="en"');
    expect(english).toMatch(/<h1[^>]*>.*Weather Conditions.*<\/h1>/s);
    expect(english).toContain('<title>Weather Conditions · Jani Heikkinen</title>');

    const finnish = await (await request.get('/fi/weather')).text();
    expect(finnish).toContain('<html lang="fi"');
    expect(finnish).toMatch(/<h1[^>]*>.*Sääolosuhteet.*<\/h1>/s);
    expect(finnish).toContain('<link rel="canonical" href="https://janiheikkinen.com/fi/weather">');

    const home = await (await request.get('/')).text();
    expect(home).toContain('What will you explore?');
    expect(home).toContain('href="/trams"');
  });

  test('are written without calling any API: live data shows as loading', async ({ request }) => {
    for (const path of ['/weather', '/electricity', '/github', '/third-party-notices']) {
      const html = await (await request.get(path)).text();
      const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
      expect(main, path).toContain('animate-pulse');
      expect(main, path).not.toContain('text-red-400');
    }
    const trams = await (await request.get('/trams')).text();
    expect(trams).toContain('Loading the map…');
    expect(trams).not.toContain('Could not load the tram map');
  });

  for (const path of PAGES) {
    test(`${path} is taken over by the app without a mismatch`, async ({ page }) => {
      const problems: string[] = [];
      page.on('pageerror', (error) => problems.push(error.message));
      page.on('console', (message) => {
        if (
          ['error', 'warning'].includes(message.type()) &&
          /NG0?5\d\d|hydrat/i.test(message.text())
        )
          problems.push(message.text());
      });
      await page.goto(path);
      await expect(page.locator('main h1')).toBeVisible();
      await hydrated(page);

      expect(problems).toEqual([]);
    });
  }

  test('the visualizers start from the numbers the prerendered page shows', async ({ page }) => {
    for (const { path, bars } of [
      { path: '/sorting', bars: '.bar' },
      { path: '/searching', bars: '[data-testid="search-bars"] .bar' },
    ]) {
      const release = await holdApp(page);
      await page.goto(path, { waitUntil: 'commit' });
      // As numbers: the style text is rounded differently once the app has written it.
      const heights = () =>
        page
          .locator(bars)
          .evaluateAll((all) =>
            all.map((bar) => Math.round(parseFloat((bar as HTMLElement).style.height) * 100)),
          );
      await expect(page.locator(bars).first()).toBeVisible();
      const prerendered = await heights();
      expect(prerendered.length).toBeGreaterThan(4);

      release();
      await expect(page.getByRole('button', { name: /^Start/ })).toBeEnabled();
      await hydrated(page);

      // The app drew nothing new: its bars are the ones that came in the HTML.
      expect(await heights()).toEqual(prerendered);
      await page.unrouteAll();
    }
  });

  test('a Finnish page never flips to English while the app starts', async ({ page }) => {
    // Note every text the Explore button shows, from the first paint on.
    await page.addInitScript(() => {
      const seen = new Set<string>();
      (window as unknown as { exploreTexts: Set<string> }).exploreTexts = seen;
      const note = () => {
        const text = document.querySelector('.explore-button')?.firstChild?.textContent?.trim();
        if (text) seen.add(text);
      };
      new MutationObserver(note).observe(document, {
        subtree: true,
        childList: true,
        characterData: true,
      });
    });

    await page.goto('/fi/weather');
    await hydrated(page);
    await expect(page.locator('h1')).toHaveText('Sääolosuhteet');

    const texts = await page.evaluate(() => [
      ...(window as unknown as { exploreTexts: Set<string> }).exploreTexts,
    ]);
    expect(texts).toEqual(['Tutustu']);
  });

  test('keeps what was typed before the app started', async ({ page }) => {
    const release = await holdApp(page);

    await page.goto('/weather', { waitUntil: 'commit' });
    const field = page.getByPlaceholder('Search location...');
    await field.fill('Tampere');
    const geocoding = page.waitForRequest(API.geocoding);
    release();

    await page.getByRole('button', { name: 'Search', exact: true }).click();
    expect(new URL((await geocoding).url()).searchParams.get('name')).toBe('Tampere');
    await expect(page.getByText('Tampere Weather')).toBeVisible();
  });
});
