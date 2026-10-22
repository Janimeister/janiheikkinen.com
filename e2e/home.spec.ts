import { expect, failApi, test } from './api-mocks';
import { CAT_FACT } from './fixtures/api-data';

/** Social link expectations */
const SOCIAL_LINKS = [
  { label: 'GitHub', href: 'https://github.com/Janimeister' },
  { label: 'YouTube', href: 'https://youtube.com/@Janimeister' },
  { label: 'Twitch', href: 'https://twitch.tv/Janimeister' },
] as const;

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('displays hero with name and typing effect', async ({ page }) => {
    await expect(page.locator('app-hero h1')).toContainText('Jani Heikkinen');
    const typing = page.locator('app-typing-effect');
    await expect(typing).toBeVisible();
    await expect(typing).not.toHaveText('');
  });

  test('social links point to correct destinations', async ({ page }) => {
    await expect(page.locator('app-hero .social-link')).toHaveCount(SOCIAL_LINKS.length);

    for (const { label, href } of SOCIAL_LINKS) {
      const link = page.locator(`app-hero a[aria-label="${label}"]`);
      await expect(link).toHaveAttribute('href', href);
    }
  });

  test('shows a cat fact', async ({ page }) => {
    await expect(page.getByTestId('catfact-text')).toHaveText(`🐱 ${CAT_FACT.fact}`);
  });

  test('footer shows copyright and Angular mention', async ({ page }) => {
    const footer = page.locator('app-footer footer');
    await expect(footer).toBeVisible();
    await expect(footer).toContainText('Jani Heikkinen');
    await expect(footer).toContainText('Angular');
  });

  test('footer has third-party notices link', async ({ page }) => {
    const link = page.locator('app-footer a[href="/third-party-notices"]');
    await expect(link).toBeVisible();
    await expect(link).toContainText('Third-Party Notices');
  });

  test('renders correctly on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await expect(page.locator('app-hero h1')).toBeVisible();
    await expect(page.locator('app-navbar nav')).toBeVisible();
  });
});

test.describe('Home Page without the cat fact service', () => {
  test('falls back to a built-in fact', async ({ page }) => {
    await failApi(page, 'catFact');
    await page.goto('/');
    await expect(page.getByTestId('catfact-text')).toContainText('Cats sleep for around 13 to 16');
    await expect(page.locator('app-hero h1')).toContainText('Jani Heikkinen');
  });
});
