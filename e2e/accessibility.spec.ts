import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PAGES = [
  { path: '/', name: 'Home' },
  { path: '/weather', name: 'Weather' },
  { path: '/electricity', name: 'Electricity' },
  { path: '/github', name: 'GitHub' },
  { path: '/ascii', name: 'ASCII' },
  { path: '/snake', name: 'Snake' },
  { path: '/pet', name: 'Pet' },
] as const;

test.describe('Accessibility', () => {
  for (const { path, name } of PAGES) {
    test(`${name} page (${path}) should have no axe violations`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(path);

      // Wait for page content to render
      await expect(page.locator('app-navbar nav')).toBeVisible();

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      expect(results.violations).toEqual([]);
    });
  }
});
