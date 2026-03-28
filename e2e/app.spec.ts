import { test, expect, type Page } from '@playwright/test';

// ── Helpers ──────────────────────────────────────────────────────────

const API_TIMEOUT = 15_000;

/** Nav link labels and their expected route / page heading */
const NAV_ROUTES = [
  { label: 'Weather', path: '/weather', heading: 'Weather' },
  { label: 'Electricity', path: '/electricity', heading: 'Electricity Prices' },
  { label: 'GitHub', path: '/github', heading: 'GitHub Profile' },
] as const;

/** Social link expectations */
const SOCIAL_LINKS = [
  { label: 'GitHub', href: 'https://github.com/Janimeister' },
  { label: 'YouTube', href: 'https://youtube.com/@Janimeister' },
  { label: 'Twitch', href: 'https://twitch.tv/Janimeister' },
] as const;

/** Assert that a section heading OR a fallback error is visible (for API-driven pages) */
async function expectSectionOrError(page: Page, headingText: string) {
  const section = page.locator('h2', { hasText: headingText });
  const error = page.locator('.text-red-400');
  await expect(section.or(error).first()).toBeVisible({ timeout: API_TIMEOUT });
}

/** Assert that a detail page has the standard "Back to Home" link */
async function expectBackLink(page: Page) {
  await expect(page.locator('a[href="/"]', { hasText: 'Back to Home' })).toBeVisible();
}

/** Assert that an attribution link is present */
async function expectAttribution(page: Page, href: string) {
  await expect(page.locator(`a[href="${href}"]`)).toBeVisible();
}

// ── Tests ────────────────────────────────────────────────────────────

test.describe('Navigation', () => {
  test('page has correct title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Jani Heikkinen/);
  });

  test('navbar shows logo and all links', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('app-navbar nav')).toBeVisible();
    await expect(page.locator('app-navbar a').first()).toContainText('JH');

    for (const { label } of NAV_ROUTES) {
      await expect(page.locator('app-navbar a', { hasText: label })).toBeVisible();
    }
  });

  for (const { label, path, heading } of NAV_ROUTES) {
    test(`"${label}" link navigates to ${path}`, async ({ page }) => {
      await page.goto('/');
      await page.click(`app-navbar a:has-text("${label}")`);
      await expect(page).toHaveURL(new RegExp(path));
      await expect(page.locator('h1')).toContainText(heading);
    });
  }

  test('unknown route redirects to home', async ({ page }) => {
    await page.goto('/nonexistent');
    await expect(page).toHaveURL(/\/$/);
  });
});

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

  test('cat fact loads', async ({ page }) => {
    const content = page.locator('[data-testid="catfact-text"]');
    await expect(content).toBeVisible({ timeout: API_TIMEOUT });
  });

  test('footer shows copyright and Angular mention', async ({ page }) => {
    const footer = page.locator('app-footer footer');
    await expect(footer).toBeVisible();
    await expect(footer).toContainText('Jani Heikkinen');
    await expect(footer).toContainText('Angular');
  });

  test('renders correctly on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await expect(page.locator('app-hero h1')).toBeVisible();
    await expect(page.locator('app-navbar nav')).toBeVisible();
  });
});

test.describe('Weather Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/weather');
  });

  test('has heading and back link', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Weather');
    await expectBackLink(page);
  });

  test('loads data sections', async ({ page }) => {
    const sections = ['Current Conditions', '24-Hour Forecast', 'Temperature Trend', '7-Day Forecast'];
    for (const heading of sections) {
      await expectSectionOrError(page, heading);
    }
  });

  test('shows Open-Meteo attribution', async ({ page }) => {
    await expectAttribution(page, 'https://open-meteo.com');
  });
});

test.describe('Electricity Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/electricity');
  });

  test('has heading and back link', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Electricity Prices');
    await expectBackLink(page);
  });

  test('loads data sections', async ({ page }) => {
    const sections = ['Current Price', 'Today Stats', 'Price Chart', 'Hourly Prices'];
    for (const heading of sections) {
      await expectSectionOrError(page, heading);
    }
  });

  test('shows Porssisähkö attribution', async ({ page }) => {
    await expectAttribution(page, 'https://porssisahko.net');
  });
});

test.describe('GitHub Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/github');
  });

  test('has heading and back link', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('GitHub Profile');
    await expectBackLink(page);
  });

  test('loads data sections', async ({ page }) => {
    const sections = ['Languages', 'Repositories', 'Recent Activity'];
    for (const heading of sections) {
      await expectSectionOrError(page, heading);
    }
  });
});
