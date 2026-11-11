import { test, expect } from './api-mocks';

test.describe('Language Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('cookie-consent', 'accepted'));
  });

  test('switches between English and Finnish, each at its own address', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('button', { name: 'Explore', exact: true })).toBeVisible();
    await expect(page.getByTestId('language-en')).toHaveAttribute('aria-current', 'true');

    await page.getByTestId('language-fi').click();

    await expect(page).toHaveURL(/\/fi$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'fi');
    await expect(page.getByTestId('language-fi')).toHaveAttribute('aria-current', 'true');
    await expect(page.getByRole('button', { name: 'Tutustu', exact: true })).toBeVisible();
    await expect(page.locator('app-home app-page-directory')).toContainText('Sähkö');
    await expect(page.locator('app-footer')).toContainText('Kolmansien osapuolten ilmoitukset');

    // Links keep the visitor in Finnish.
    await page.locator('app-home app-page-directory a[href="/fi/weather"]').click();
    await expect(page).toHaveURL(/\/fi\/weather$/);
    await expect(page.locator('h1')).toContainText('Sääolosuhteet');
    await expect(page).toHaveTitle('Sääolosuhteet · Jani Heikkinen');
    await page.getByRole('link', { name: 'Takaisin etusivulle' }).click();
    await expect(page).toHaveURL(/\/fi$/);

    await page.getByTestId('language-en').click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('button', { name: 'Explore', exact: true })).toBeVisible();
  });

  test('switching stays on the same page and keeps its query', async ({ page }) => {
    await page.goto('/departures?stop=HSL:1130446');
    await expect(page.getByTestId('language-fi')).toHaveAttribute(
      'href',
      '/fi/departures?stop=HSL:1130446',
    );

    await page.getByTestId('language-fi').click();

    await expect(page).toHaveURL(/\/fi\/departures\?stop=HSL:1130446$/);
    await expect(page.locator('h1')).toHaveText('Lähdöt');
    await expect(page.getByTestId('language-en')).toHaveAttribute(
      'href',
      '/departures?stop=HSL:1130446',
    );
  });

  test('opens a Finnish address in Finnish, linked to its English twin', async ({ page }) => {
    await page.goto('/fi/trams');

    await expect(page.locator('html')).toHaveAttribute('lang', 'fi');
    await expect(page.locator('h1')).toHaveText('Ratikkakartta');
    await expect(page.getByRole('button', { name: 'Tutustu', exact: true })).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://janiheikkinen.com/fi/trams',
    );
    const alternate = (language: string) =>
      page.locator(`link[rel="alternate"][hreflang="${language}"]`);
    await expect(alternate('en')).toHaveAttribute('href', 'https://janiheikkinen.com/trams');
    await expect(alternate('fi')).toHaveAttribute('href', 'https://janiheikkinen.com/fi/trams');
    await expect(alternate('x-default')).toHaveAttribute('href', 'https://janiheikkinen.com/trams');
  });

  test('remembers the chosen language on the next visit', async ({ page }) => {
    await page.goto('/weather');
    await page.getByTestId('language-fi').click();
    await expect(page).toHaveURL(/\/fi\/weather$/);

    // An English address now opens in Finnish, on the same page.
    await page.goto('/snake');
    await expect(page).toHaveURL(/\/fi\/snake$/);
    await expect(page.locator('h1')).toHaveText('Matopeli');
    await page.goto('/');
    await expect(page).toHaveURL(/\/fi\/?$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'fi');

    // Until English is chosen again.
    await page.getByTestId('language-en').click();
    await expect(page).toHaveURL(/\/$/);
    await page.goto('/snake');
    await expect(page).toHaveURL(/\/snake$/);
    await expect(page.locator('h1')).toHaveText('Snake Game');
  });

  test('shows the not-found page in Finnish under /fi', async ({ page }) => {
    await page.goto('/fi/ei-ole');

    await expect(page.locator('h1')).toHaveText('Sivua ei löytynyt');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
    await page.locator('main a').click();
    await expect(page).toHaveURL(/\/fi$/);
  });
});
