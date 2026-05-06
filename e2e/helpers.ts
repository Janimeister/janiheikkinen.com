import { expect, type Page } from '@playwright/test';

export const API_TIMEOUT = 15_000;

/** Assert that a section heading OR a fallback error is visible (for API-driven pages) */
export async function expectSectionOrError(page: Page, headingText: string) {
  const section = page.locator('h2', { hasText: headingText });
  const error = page.locator('.text-red-400');
  await expect(section.or(error).first()).toBeVisible({ timeout: API_TIMEOUT });
}

/** Assert that a detail page has the standard "Back to Home" link */
export async function expectBackLink(page: Page) {
  await expect(page.locator('a[href="/"]', { hasText: 'Back to Home' })).toBeVisible();
}

/** Assert that an attribution link is present */
export async function expectAttribution(page: Page, href: string) {
  await expect(page.locator(`a[href="${href}"]`)).toBeVisible();
}
