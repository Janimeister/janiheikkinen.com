import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './api-mocks';

/**
 * For each data-driven page, an h2 that only appears once its data has rendered. The APIs answer
 * from fixtures (see api-mocks.ts), so the scan always covers the loaded page, never an error card.
 */
const PAGES = [
  { path: '/sorting', name: 'Sorting', waitSection: null },
  { path: '/searching', name: 'Searching', waitSection: null },
  { path: '/pathfinding', name: 'Pathfinding', waitSection: null },
  { path: '/', name: 'Home', waitSection: null },
  { path: '/weather', name: 'Weather', waitSection: '24-Hour Forecast' },
  { path: '/electricity', name: 'Electricity', waitSection: 'Current Price' },
  { path: '/trams', name: 'Trams', waitSection: 'Legend' },
  { path: '/github', name: 'GitHub', waitSection: 'Repositories' },
  { path: '/ascii', name: 'ASCII', waitSection: null },
  { path: '/snake', name: 'Snake', waitSection: null },
  { path: '/pet', name: 'Pet', waitSection: null },
  {
    path: '/third-party-notices',
    name: 'Third-Party Notices',
    waitSection: 'Open Source Software',
  },
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

      if (waitSection) {
        await expect(page.locator('h2', { hasText: waitSection })).toBeVisible({ timeout: 30_000 });
      }

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      expect(results.violations).toEqual([]);
    });
  }
});
