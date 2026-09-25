import { expect, test } from './visualizer-fixture';

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
  test('handles a missing singleton target and resets safely on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/searching');
    await page.getByLabel('Algorithm', { exact: true }).selectOption('binary');
    await page.getByRole('slider', { name: /^Numbers:/ }).press('Home');
    await expect(page.locator('[data-testid="search-bars"] .bar')).toHaveCount(1);
    await page.getByLabel('Target value', { exact: true }).fill('999');
    await page.getByRole('slider', { name: /^Speed:/ }).press('End');
    await page.getByRole('button', { name: 'Start search', exact: true }).click();
    await expect(page.getByRole('status')).toHaveText('Search complete');
    await expect(page.getByText('Target not found', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Reset search', exact: true }).click();
    await expect(page.getByTestId('search-comparisons')).toHaveText('0');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });

  test('cancels a running search when navigating to another visualizer', async ({ page }) => {
    await page.goto('/searching');
    await page.getByRole('slider', { name: /^Speed:/ }).press('Home');
    await page.getByRole('button', { name: 'Start search', exact: true }).click();
    await page.getByRole('link', { name: 'Pathfinding', exact: true }).click();
    await expect(page.locator('h1')).toHaveText('Pathfinding Algorithms');
    await page.getByRole('link', { name: 'Searching', exact: true }).click();
    await expect(page.getByRole('status')).toHaveText('Ready');
    await expect(page.getByTestId('search-comparisons')).toHaveText('0');
  });
});
