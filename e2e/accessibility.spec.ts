import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { expectSectionOrError } from './helpers';

/**
 * For each API-driven page, the first stable h2 heading that appears once data
 * (or an error card) has rendered. Using `expectSectionOrError` is more
 * deterministic than `waitForLoadState('networkidle')` because it directly
 * asserts either a known success element or the error fallback.
 */
const PAGES = [
  { path: '/', name: 'Home', waitSection: null },
  { path: '/weather', name: 'Weather', waitSection: '24-Hour Forecast' },
  { path: '/electricity', name: 'Electricity', waitSection: 'Current Price' },
  { path: '/github', name: 'GitHub', waitSection: 'Repositories' },
  { path: '/ascii', name: 'ASCII', waitSection: null },
  { path: '/snake', name: 'Snake', waitSection: null },
  { path: '/pet', name: 'Pet', waitSection: null },
] as const;

test.describe('Accessibility', () => {
  // Each test does: goto + optional API wait + AxeBuilder.analyze — give each 60s
  test.describe.configure({ timeout: 60_000 });
  for (const { path, name, waitSection } of PAGES) {
    test(`${name} page (${path}) should have no axe violations`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(path);

      // Wait for the page h1 heading to confirm initial render is complete
      await expect(page.locator('h1').first()).toBeVisible();

      // For API-backed pages, wait for a known section h2 OR error card to appear
      // before running the axe scan — ensures the scan covers fully-loaded state
      if (waitSection) {
        await expectSectionOrError(page, waitSection);
      }

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      expect(results.violations).toEqual([]);
    });
  }
});
