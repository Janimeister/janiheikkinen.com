import { test, expect } from './api-mocks';
import { expectBackLink, SLOW_TIMEOUT } from './helpers';

test.describe('Third-Party Notices Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/third-party-notices');
  });

  test('has heading and back link', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Third-Party Notices');
    await expectBackLink(page);
  });

  test('renders the notices file with its section headings', async ({ page }) => {
    // The file is served with the site, so unlike the API pages there's no error to accept.
    const content = page.locator('.notices-content');
    await expect(content).toBeVisible({ timeout: SLOW_TIMEOUT });
    await expect(content.locator('h2').first()).toBeVisible();
    await expect(content.locator('h3').first()).toBeVisible();
  });

  test('footer links to this page', async ({ page }) => {
    const footerLink = page.locator('app-footer a[href="/third-party-notices"]');
    await expect(footerLink).toBeVisible();
  });

  test('fits a phone screen without scrolling sideways', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 740 });
    await expect(page.locator('.notices-content h2').first()).toBeVisible({
      timeout: SLOW_TIMEOUT,
    });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    const links = await page
      .locator('.notices-content a')
      .evaluateAll((as) =>
        as.map((a) => a.getAttribute('href')).filter((href) => href?.endsWith(')')),
      );
    expect(links).toEqual([]);
  });
});
