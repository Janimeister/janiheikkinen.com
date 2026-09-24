import { expect, test } from '@playwright/test';

test.describe('Pathfinding visualizer', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('cookie-consent', 'accepted');
      localStorage.setItem('app-language', 'en');
    });
  });

  test('finds a weighted path with Dijkstra and reports its cost', async ({ page }) => {
    await page.goto('/pathfinding');
    await page.getByLabel('Algorithm', { exact: true }).selectOption('dijkstra');
    await page.getByRole('slider', { name: /^Speed:/ }).press('End');
    await page.getByRole('button', { name: 'Start search', exact: true }).click();

    await expect(page.getByRole('status')).toContainText('Path found');
    await expect(page.getByTestId('path-length')).not.toHaveText('—');
    await expect(page.getByTestId('path-cost')).not.toHaveText('—');
    await expect(page.locator('[data-cell="13"]')).toHaveText('S');
    await expect(page.locator('[data-cell="106"]')).toHaveText('G');
  });

  test('reports no path when a wall spans the grid', async ({ page }) => {
    await page.goto('/pathfinding');
    await page.getByLabel('Algorithm', { exact: true }).selectOption('astar');
    await page.getByRole('slider', { name: /^Speed:/ }).press('End');
    await page.getByRole('button', { name: 'Toggle wall', exact: true }).click();
    for (let row = 0; row < 10; row++) {
      await page.locator(`[data-cell="${row * 12 + 6}"]`).click();
    }

    await page.getByRole('button', { name: 'Start search', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('No route available');
    await expect(page.getByTestId('path-cost')).toHaveText('—');
  });

  test('keeps the grid in a narrow viewport and supports endpoint editing', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/pathfinding');
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.getByRole('button', { name: 'Move start', exact: true }).click();
    await page.locator('[data-cell="25"]').click();
    await expect(page.locator('[data-cell="25"]')).toHaveText('S');
    await expect(page.getByRole('link', { name: 'Searching' })).toBeVisible();
  });
});
