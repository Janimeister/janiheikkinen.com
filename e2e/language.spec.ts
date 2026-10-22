import { test, expect } from './api-mocks';

test.describe('Language Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      try {
        localStorage.removeItem('app-language');
      } catch {
        /* ignore */
      }
    });
    await page.reload();
  });

  test('switches between English and Finnish and persists the choice', async ({ page }) => {
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('button', { name: 'Explore', exact: true })).toBeVisible();

    await page.getByTestId('language-fi').click();

    await expect(page.locator('html')).toHaveAttribute('lang', 'fi');
    await expect(page.getByRole('button', { name: 'Tutustu', exact: true })).toBeVisible();
    await expect(page.locator('app-home app-page-directory')).toContainText('Sähkö');
    await expect(page.locator('app-footer')).toContainText('Kolmansien osapuolten ilmoitukset');

    // Verify Finnish copy on a detail page
    await page.goto('/weather');
    await expect(page.locator('h1')).toContainText('Sääolosuhteet');

    await page.goto('/');

    await page.reload();

    await expect(page.locator('html')).toHaveAttribute('lang', 'fi');
    await expect(page.getByRole('button', { name: 'Tutustu', exact: true })).toBeVisible();

    await page.getByTestId('language-en').click();

    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('button', { name: 'Explore', exact: true })).toBeVisible();
  });
});
