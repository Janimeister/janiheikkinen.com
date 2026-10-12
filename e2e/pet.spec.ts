import { test, expect } from './api-mocks';
import { expectBackLink } from './helpers';

test.describe('Virtual Pet Page', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any persisted pet so each test starts from the hatching screen.
    await page.addInitScript(() => {
      try {
        localStorage.removeItem('virtual-pet-v1');
      } catch {
        /* ignore */
      }
    });
    await page.goto('/pet');
  });

  test('has heading and back link', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Virtual Pet');
    await expectBackLink(page);
  });

  test('shows mystery egg and hatch button', async ({ page }) => {
    await expect(page.locator('[data-testid="pet-hatch"]')).toBeVisible();
    await expect(page.locator('[data-testid="pet-hatch-btn"]')).toBeVisible();
  });

  test('hatch button is disabled without a name', async ({ page }) => {
    await expect(page.locator('[data-testid="pet-hatch-btn"]')).toBeDisabled();
  });

  test('hatching reveals a pet with stats and care actions', async ({ page }) => {
    await page.fill('[data-testid="pet-name-input"]', 'Fluffy');
    await page.click('[data-testid="pet-hatch-btn"]');

    // Hatch card disappears, pet name is shown
    await expect(page.locator('[data-testid="pet-hatch"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="pet-name"]')).toContainText('Fluffy');
    await expect(page.locator('[data-testid="pet-stage"]')).toBeVisible();
    await expect(page.locator('[data-testid="pet-sprite"]')).toBeVisible();

    // Stats and care action buttons are present
    await expect(page.locator('[data-testid="pet-stats"]')).toBeVisible();
    for (const id of [
      'pet-feed-btn',
      'pet-play-btn',
      'pet-clean-btn',
      'pet-sleep-btn',
      'pet-heal-btn',
    ]) {
      await expect(page.locator(`[data-testid="${id}"]`)).toBeVisible();
    }
  });

  test('feeding the pet logs an event', async ({ page }) => {
    await page.fill('[data-testid="pet-name-input"]', 'Biscuit');
    await page.click('[data-testid="pet-hatch-btn"]');

    await page.click('[data-testid="pet-feed-btn"]');
    const log = page.locator('[data-testid="pet-log"]');
    await expect(log).toBeVisible();
    await expect(log).toContainText('Biscuit');
  });

  test('sleep button toggles wake label', async ({ page }) => {
    await page.fill('[data-testid="pet-name-input"]', 'Nap');
    await page.click('[data-testid="pet-hatch-btn"]');

    const sleepBtn = page.locator('[data-testid="pet-sleep-btn"]');
    await expect(sleepBtn).toContainText(/Sleep/);
    await sleepBtn.click();
    await expect(sleepBtn).toContainText(/Wake/);
  });

  test('reset returns to the egg hatching screen', async ({ page }) => {
    await page.fill('[data-testid="pet-name-input"]', 'Ephemeral');
    await page.click('[data-testid="pet-hatch-btn"]');
    await expect(page.locator('[data-testid="pet-name"]')).toBeVisible();

    await page.click('[data-testid="pet-reset-btn"]');
    await expect(page.locator('[data-testid="pet-hatch"]')).toBeVisible();
  });

  test('shows how-to-play instructions', async ({ page }) => {
    await expect(page.locator('h2', { hasText: 'How to play' })).toBeVisible();
  });
});
