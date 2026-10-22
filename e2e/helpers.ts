import { expect, type Page } from '@playwright/test';

/** For work that takes a while to settle, like the ASCII animation. */
export const SLOW_TIMEOUT = 15_000;

/** Assert that a detail page has the standard "Back to Home" link */
export async function expectBackLink(page: Page) {
  await expect(page.locator('a[href="/"]', { hasText: 'Back to Home' })).toBeVisible();
}

/** Assert that an attribution link is present */
export async function expectAttribution(page: Page, href: string) {
  await expect(page.locator('main').locator(`a[href="${href}"]`)).toBeVisible();
}
