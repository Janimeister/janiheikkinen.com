import { expect, test } from '@playwright/test';

test.describe('Searching visualizer', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('cookie-consent', 'accepted');
      localStorage.setItem('app-language', 'en');
    });
  });

  test('finds a deterministic first value with Binary Search', async ({ page }) => {
    await page.goto('/searching');
    await page.getByLabel('Algorithm', { exact: true }).selectOption('binary');
    const firstValue = await page
      .locator('[data-testid="search-bars"] .bar')
      .first()
      .getAttribute('data-value');
    await page.getByLabel('Target value', { exact: true }).fill(firstValue!);
    await page.getByRole('slider', { name: /^Speed:/ }).press('End');

    await page.getByRole('button', { name: 'Start search', exact: true }).click();
    await expect(page.getByRole('status')).toHaveText('Search complete');
    await expect(page.getByText('Target found', { exact: true })).toBeVisible();
    await expect(page.getByText('Target index').locator('..')).toContainText('0');
    expect(Number(await page.getByTestId('search-comparisons').textContent())).toBeLessThan(5);
  });
});
