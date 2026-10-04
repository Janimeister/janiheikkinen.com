import { test, expect, type Page, type Route } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { expectAttribution, expectBackLink } from './helpers';

const KAUPPATORI = {
  gtfsId: 'HSL:1130446',
  name: 'Kauppatori',
  code: 'H0405',
  platformCode: null,
  desc: 'Pohjoisesplanadi',
  vehicleMode: 'TRAM',
  routes: [{ shortName: '2' }, { shortName: '4' }],
};

const PASILA = {
  gtfsId: 'HSL:1000202',
  name: 'Pasila',
  code: null,
  platformCode: null,
  desc: null,
  vehicleMode: 'RAIL',
  routes: [{ shortName: 'I' }, { shortName: 'P' }],
};

/**
 * Departures `minutes` from now. The service day is "now" plus a little slack for the round trip,
 * which the page doesn't mind: it only adds the two.
 */
function board(place: typeof KAUPPATORI, rows: [string, string, string, number][]) {
  const day = Math.floor(Date.now() / 1000) + 30;
  return {
    data: {
      place: {
        ...place,
        stoptimesWithoutPatterns: rows.map(([line, mode, headsign, minutes], i) => ({
          serviceDay: day,
          scheduledDeparture: minutes * 60,
          realtimeDeparture: minutes * 60 + (i === 1 ? 120 : 0),
          departureDelay: i === 1 ? 120 : 0,
          realtime: i < 2,
          realtimeState: i < 2 ? 'UPDATED' : 'SCHEDULED',
          headsign,
          stop: { platformCode: mode === 'RAIL' ? String(i + 1) : null },
          trip: { gtfsId: `HSL:${line}_${i}`, route: { shortName: line, mode } },
        })),
      },
    },
  };
}

/** Answers the page's GraphQL requests like Digitransit would, and counts them. */
async function mockDigitransit(page: Page, fail = false) {
  const calls: string[] = [];
  await page.route('**/api/digitransit', async (route: Route) => {
    const { query, variables } = route.request().postDataJSON();
    const operation = /query (\w+)/.exec(query)![1];
    calls.push(operation);
    if (fail) return route.fulfill({ status: 500, body: 'Upstream error' });
    let json: unknown;
    if (operation === 'Search') {
      json = { data: { stations: [PASILA], stops: [KAUPPATORI] } };
    } else if (variables.id === PASILA.gtfsId) {
      json = board(PASILA, [
        ['I', 'RAIL', 'Lentoasema', 3],
        ['P', 'RAIL', 'Helsinki', 7],
      ]);
    } else {
      json = board(KAUPPATORI, [
        ['4', 'TRAM', 'Munkkiniemi', 0],
        ['2', 'TRAM', 'Pasila', 4],
        ['4', 'TRAM', 'Katajanokka', 25],
      ]);
    }
    return route.fulfill({ json });
  });
  return calls;
}

test.describe('Departures Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(() => {
      localStorage.setItem('cookie-consent', 'accepted');
      localStorage.setItem('app-language', 'en');
    });
  });

  test('has heading, back link and attribution', async ({ page }) => {
    await page.goto('/departures');
    await expect(page.locator('h1')).toContainText('Departures');
    await expectBackLink(page);
    await expectAttribution(page, 'https://digitransit.fi/en/developers/');
  });

  test('finds a stop and shows its departures', async ({ page }) => {
    const calls = await mockDigitransit(page);
    await page.goto('/departures');
    await page.getByRole('button', { name: 'Kauppatori', exact: true }).click();
    await expect(page.getByTestId('departures-search')).toHaveValue('Kauppatori');

    const results = page.getByTestId('departures-results').getByRole('button');
    await expect(results).toHaveCount(2);
    // Stations come first.
    await expect(results.first()).toContainText('Pasila');
    await results.nth(1).click();

    await expect(page).toHaveURL(/\/departures\?stop=HSL:1130446$/);
    const board = page.getByTestId('departure-board');
    await expect(board.getByRole('heading', { level: 2 })).toHaveText('Kauppatori');
    const rows = board.getByTestId('departure-row');
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(0)).toContainText('Munkkiniemi');
    await expect(rows.nth(0)).toContainText('now');
    await expect(rows.nth(1)).toContainText('+2 min');
    await expect(rows.nth(1)).toContainText('6 min');
    await expect(rows.nth(2)).toContainText(/\d\d:\d\d/);
    expect(calls).toEqual(['Search', 'StopDepartures']);

    await board.getByRole('button', { name: 'Refresh' }).click();
    await expect.poll(() => calls.length).toBe(3);
  });

  test('opens stations from the address and remembers recent stops', async ({ page }) => {
    await mockDigitransit(page);
    await page.goto('/departures?station=HSL:1000202');
    const board = page.getByTestId('departure-board');
    await expect(board.getByRole('columnheader', { name: 'Plat.' })).toBeVisible();
    await expect(board.getByTestId('departure-row').first()).toContainText('Lentoasema');

    await page.getByTestId('departures-search').fill('pasila');
    await page.getByTestId('departures-results').getByRole('button').first().click();
    await page.goto('/departures');
    await expect(page.getByText('Recent')).toBeVisible();
    await expect(board.getByRole('heading', { level: 2 })).toHaveText('Pasila');
  });

  test('shows an error card when Digitransit fails', async ({ page }) => {
    await mockDigitransit(page, true);
    await page.goto('/departures?stop=HSL:1130446');
    await expect(page.locator('p.text-red-400')).toHaveText(
      'Could not load departures. Please try again later.',
    );
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  });

  test('the board has no axe violations', async ({ page }) => {
    await mockDigitransit(page);
    await page.goto('/departures?station=HSL:1000202');
    await expect(page.getByTestId('departure-row').first()).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
