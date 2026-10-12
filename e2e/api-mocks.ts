import { test as base, expect, type Page, type Route } from '@playwright/test';
import {
  CAT_FACT,
  ELECTRICITY,
  FIXED_NOW,
  GEOCODING_TAMPERE,
  GITHUB_EVENTS,
  GITHUB_REPOS,
  GITHUB_USER,
  WEATHER,
} from './fixtures/api-data';

/** URL patterns of the APIs the site reads. Electricity goes through the dev server's proxy. */
export const API = {
  weather: 'https://api.open-meteo.com/v1/forecast**',
  geocoding: 'https://geocoding-api.open-meteo.com/v1/search**',
  electricity: '**/api/porssisahko/v2/latest-prices.json',
  githubUser: 'https://api.github.com/users/Janimeister',
  githubRepos: 'https://api.github.com/users/Janimeister/repos**',
  githubEvents: 'https://api.github.com/users/Janimeister/events/public**',
  catFact: 'https://catfact.ninja/fact**',
} as const;

export type Api = keyof typeof API;

const RESPONSES: Record<Api, unknown> = {
  weather: WEATHER,
  geocoding: GEOCODING_TAMPERE,
  electricity: ELECTRICITY,
  githubUser: GITHUB_USER,
  githubRepos: GITHUB_REPOS,
  githubEvents: GITHUB_EVENTS,
  catFact: CAT_FACT,
};

const CORS = { 'access-control-allow-origin': '*' };

const isThirdParty = (url: URL) =>
  url.protocol.startsWith('http') && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1';

/**
 * Every page in these tests talks to fixed API responses instead of the live services. A request
 * to any other third-party host is blocked and fails the test, so a new API can't slip in unmocked.
 */
export const test = base.extend<{ mockApis: void }>({
  mockApis: [
    async ({ page }, use) => {
      const unmocked: string[] = [];
      // Registered first, so it only sees requests no mock below handles.
      await page.route(isThirdParty, (route) => {
        unmocked.push(route.request().url());
        return route.abort('blockedbyclient');
      });
      for (const api of Object.keys(API) as Api[]) {
        await respondWith(page, api, RESPONSES[api]);
      }
      await use();
      expect(unmocked, 'Requests to third-party hosts without a mock').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/** Answer `api` with `body` from now on, instead of the default fixture. */
export async function respondWith(page: Page, api: Api, body: unknown): Promise<void> {
  await page.route(API[api], (route: Route) => route.fulfill({ json: body, headers: CORS }));
}

/** Make `api` fail with an HTTP error from now on. */
export async function failApi(page: Page, api: Api, status = 503): Promise<void> {
  await page.route(API[api], (route: Route) =>
    route.fulfill({ status, body: 'Service unavailable', headers: CORS }),
  );
}

/**
 * Freeze `Date` at {@link FIXED_NOW}; timers keep running. Pair it with
 * `test.use({ timezoneId: TIME_ZONE })` so clock times render the same on every machine.
 */
export async function freezeClock(page: Page): Promise<void> {
  await page.clock.setFixedTime(FIXED_NOW);
}
