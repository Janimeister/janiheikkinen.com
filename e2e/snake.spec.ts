import { test, expect } from './api-mocks';
import { expectBackLink } from './helpers';

test.describe('Snake Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/snake');
  });

  test('has heading and back link', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Snake Game');
    await expectBackLink(page);
  });

  test('displays game canvas', async ({ page }) => {
    await expect(page.locator('[data-testid="snake-canvas"]')).toBeVisible();
  });

  test('displays score and high score cards', async ({ page }) => {
    await expect(page.locator('[data-testid="snake-score"]')).toBeVisible();
    await expect(page.locator('[data-testid="snake-highscore"]')).toBeVisible();
  });

  test('displays start button', async ({ page }) => {
    await expect(page.locator('[data-testid="snake-start-btn"]')).toBeVisible();
  });

  test('starts game when start button is clicked', async ({ page }) => {
    await page.click('[data-testid="snake-start-btn"]');
    // Start button should disappear and game-over text should not be visible
    await expect(page.locator('[data-testid="snake-start-btn"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="snake-game-over"]')).not.toBeVisible();
  });

  test('shows how-to-play instructions', async ({ page }) => {
    await expect(page.locator('h2', { hasText: 'How to Play' })).toBeVisible();
  });

  test('Enter on a focused link follows it instead of starting a game', async ({ page }) => {
    await page.locator('main a[href="/"]').first().focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/$/);
  });

  test('Enter on the page starts a game, and hiding the tab pauses it', async ({ page }) => {
    await page.locator('h1').click();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-testid="snake-start-btn"]')).not.toBeVisible();

    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => 'hidden',
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect(page.getByText('Paused', { exact: true })).toBeVisible();
  });

  test('shows d-pad controls on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await expect(page.locator('button[aria-label="Move up"]')).toBeVisible();
    await expect(page.locator('button[aria-label="Move left"]')).toBeVisible();
    await expect(page.locator('button[aria-label="Move right"]')).toBeVisible();
    await expect(page.locator('button[aria-label="Move down"]')).toBeVisible();
  });
});
