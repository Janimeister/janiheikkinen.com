import { test, expect } from './api-mocks';
import { expectBackLink, SLOW_TIMEOUT } from './helpers';

test.describe('ASCII Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/ascii');
  });

  test('has heading and back link', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('ASCII Art');
    await expectBackLink(page);
  });

  test('displays algorithm selector buttons', async ({ page }) => {
    const algorithms = [
      'Plasma',
      'Mandelbrot',
      'Waves',
      'Galaxy',
      'Terrain',
      'Coral Bloom',
      'Wind Lines',
      'Island Contours',
    ];
    for (const algo of algorithms) {
      await expect(page.locator('button', { hasText: algo })).toBeVisible();
    }
  });

  test('displays generate button', async ({ page }) => {
    await expect(page.locator('button', { hasText: 'Generate' })).toBeVisible();
  });

  test('generates ASCII art on load', async ({ page }) => {
    const pre = page.locator('pre.ascii-art');
    await expect(pre).toBeVisible();
    // Wait for animation to complete and visible art to appear
    await expect(pre).toHaveText(/\S/, { timeout: SLOW_TIMEOUT });
  });

  test('generates new art when algorithm is changed', async ({ page }) => {
    const pre = page.locator('pre.ascii-art');
    // Wait for initial visible art
    await expect(pre).toHaveText(/\S/, { timeout: SLOW_TIMEOUT });
    const initialArt = (await pre.textContent())?.trim() ?? '';

    // Click a different algorithm
    await page.click('button:has-text("Mandelbrot")');

    // Art should be regenerated and remain non-whitespace after switching
    await expect(pre).toHaveText(/\S/, { timeout: 15_000 });
    await expect
      .poll(async () => (await pre.textContent())?.trim() ?? '', { timeout: 15_000 })
      .not.toBe(initialArt);
  });
});
