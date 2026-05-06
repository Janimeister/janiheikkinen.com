import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/** Pages that fetch from external APIs — need extra wait for data/error state */
const API_TIMEOUT = 30_000;

const PAGES = [
  { path: '/', name: 'Home', apiDriven: false },
  { path: '/weather', name: 'Weather', apiDriven: true },
  { path: '/electricity', name: 'Electricity', apiDriven: true },
  { path: '/github', name: 'GitHub', apiDriven: true },
  { path: '/ascii', name: 'ASCII', apiDriven: false },
  { path: '/snake', name: 'Snake', apiDriven: false },
  { path: '/pet', name: 'Pet', apiDriven: false },
] as const;

test.describe('Accessibility', () => {
  for (const { path, name, apiDriven } of PAGES) {
    test(`${name} page (${path}) should have no axe violations`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(path);

      // Wait for the page h1 heading to confirm initial render is complete
      await expect(page.locator('h1').first()).toBeVisible();

      // For API-backed pages, wait for all network requests to settle so the
      // axe scan covers fully-loaded state (data or error), not skeleton markup
      if (apiDriven) {
        await page.waitForLoadState('networkidle', { timeout: API_TIMEOUT });
      }

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      expect(results.violations).toEqual([]);
    });
  }
});
