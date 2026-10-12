import { API, expect, failApi, respondWith, test } from './api-mocks';
import { TIME_ZONE } from './fixtures/api-data';
import { expectAttribution, expectBackLink } from './helpers';

// Forecast times are written in the location's zone; render them as a Helsinki visitor would.
test.use({ timezoneId: TIME_ZONE });

test.describe('Weather Page', () => {
  test('has heading, back link and attribution', async ({ page }) => {
    await page.goto('/weather');
    await expect(page.locator('h1')).toContainText('Weather Conditions');
    await expectBackLink(page);
    await expectAttribution(page, 'https://open-meteo.com');
  });

  test('shows the current conditions for Helsinki', async ({ page }) => {
    const request = page.waitForRequest(API.weather);
    await page.goto('/weather');
    const params = new URL((await request).url()).searchParams;
    expect([params.get('latitude'), params.get('longitude')]).toEqual(['60.17', '24.94']);

    const main = page.locator('main');
    await expect(main.getByText('Helsinki Weather')).toBeVisible();
    await expect(main.getByText('15.8°C')).toBeVisible();
    await expect(main.getByText('Overcast').first()).toBeVisible();
    await expect(main.getByText('12.6 km/h')).toBeVisible();
    await expect(main.getByText('24.1 km/h')).toBeVisible();
    await expect(main.getByText('1012 hPa')).toBeVisible();
  });

  test("shows today's summary, the next 24 hours and the week", async ({ page }) => {
    await page.goto('/weather');
    const main = page.locator('main');

    // Today: sunrise and sunset in the location's time, sunshine as hours and minutes.
    await expect(main.getByText('07:48').first()).toBeVisible();
    await expect(main.getByText('18:22').first()).toBeVisible();
    await expect(main.getByText('5h 0m')).toBeVisible();

    // The temperature chart starts at the hour under way (13:00, 16 °C) and covers 24 hours.
    const bars = main.getByRole('img', { name: /°C$/ });
    await expect(bars).toHaveCount(24);
    await expect(bars.first()).toHaveAccessibleName('Now: 16°C');
    await expect(bars.last()).toHaveAccessibleName(/^12:00: \d+°C$/);

    const days = main.getByTestId('forecast-day');
    await expect(days).toHaveCount(7);
    await expect(days.first()).toContainText('Today');
    await expect(days.first()).toContainText('5°');
    await expect(days.first()).toContainText('16°');
    await expect(days.nth(1)).toContainText('Tue 13');
    await expect(days.nth(1)).toContainText('6.4 mm');
    await expect(days.nth(5)).toContainText('-3°');
  });

  test('searches for another place and loads its forecast', async ({ page }) => {
    await page.goto('/weather');
    await expect(page.getByText('Helsinki Weather')).toBeVisible();

    const geocoding = page.waitForRequest(API.geocoding);
    const forecast = page.waitForRequest(
      (request) =>
        request.url().startsWith('https://api.open-meteo.com/') && request.url().includes('61.5'),
    );
    await page.getByPlaceholder('Search location...').fill('Tampere');
    await page.getByRole('button', { name: 'Search', exact: true }).click();

    expect(new URL((await geocoding).url()).searchParams.get('name')).toBe('Tampere');
    expect(new URL((await forecast).url()).searchParams.get('longitude')).toBe('23.79');
    await expect(page.getByText('Tampere Weather')).toBeVisible();
  });

  test('strips unsafe characters from a search', async ({ page }) => {
    await page.goto('/weather');
    const geocoding = page.waitForRequest(API.geocoding);
    await page.getByPlaceholder('Search location...').fill('Tampere<script>');
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    expect(new URL((await geocoding).url()).searchParams.get('name')).toBe('Tamperescript');
  });

  test('says so when a search finds nothing', async ({ page }) => {
    await respondWith(page, 'geocoding', {});
    await page.goto('/weather');
    await page.getByPlaceholder('Search location...').fill('Atlantis');
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await expect(page.getByText('No results found for "Atlantis".')).toBeVisible();
    await expect(page.getByText('Helsinki Weather')).toBeVisible();
  });

  test('says so when the search service fails', async ({ page }) => {
    await failApi(page, 'geocoding');
    await page.goto('/weather');
    await page.getByPlaceholder('Search location...').fill('Tampere');
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await expect(page.getByText('Search failed. Please try again.')).toBeVisible();
  });

  test('shows an error card when the forecast fails', async ({ page }) => {
    await failApi(page, 'weather');
    await page.goto('/weather');
    await expect(page.locator('p.text-red-400')).toHaveText(
      'Could not load weather data. Please try again later.',
    );
    await expect(page.getByTestId('forecast-day')).toHaveCount(0);
  });
});
