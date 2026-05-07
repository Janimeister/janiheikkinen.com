import { test, expect } from '@playwright/test';
import { API_TIMEOUT, expectSectionOrError, expectBackLink, expectAttribution } from './helpers';

// ── Helpers ──────────────────────────────────────────────────────────

/** Nav link labels and their expected route / page heading */
const NAV_ROUTES = [
  { label: 'Weather', path: '/weather', heading: 'Weather Conditions' },
  { label: 'Electricity', path: '/electricity', heading: 'Electricity Prices' },
  { label: 'GitHub', path: '/github', heading: 'GitHub Profile' },
  { label: 'ASCII', path: '/ascii', heading: 'ASCII Art' },
  { label: 'Snake', path: '/snake', heading: 'Snake Game' },
  { label: 'Pet', path: '/pet', heading: 'Virtual Pet' },
] as const;

/** Social link expectations */
const SOCIAL_LINKS = [
  { label: 'GitHub', href: 'https://github.com/Janimeister' },
  { label: 'YouTube', href: 'https://youtube.com/@Janimeister' },
  { label: 'Twitch', href: 'https://twitch.tv/Janimeister' },
] as const;

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
    await expect(page.locator('h1')).toContainText('Weather Conditions');
    await expectBackLink(page);
  });

  test('loads data sections', async ({ page }) => {
    const sections = ['Today', '24-Hour Forecast', 'Temperature Trend', '7-Day Forecast'];
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

test.describe('ASCII Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/ascii');
  });

  test('has heading and back link', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('ASCII Art');
    await expectBackLink(page);
  });

  test('displays algorithm selector buttons', async ({ page }) => {
    const algorithms = ['Plasma', 'Mandelbrot', 'Waves', 'Galaxy', 'Terrain', 'Coral Bloom', 'Wind Lines', 'Island Contours'];
    for (const algo of algorithms) {
      await expect(page.locator('button', { hasText: algo })).toBeVisible();
    }
  });

  test('displays generate button', async ({ page }) => {
    await expect(page.locator('button', { hasText: 'Generate' })).toBeVisible();
  });

  test('generates ASCII art on load', async ({ page }) => {
    const pre = page.locator('pre.ascii-art');
    await expect(pre).toBeVisible();
    // Wait for animation to complete and visible art to appear
    await expect(pre).toHaveText(/\S/, { timeout: API_TIMEOUT });
  });

  test('generates new art when algorithm is changed', async ({ page }) => {
    const pre = page.locator('pre.ascii-art');
    // Wait for initial visible art
    await expect(pre).toHaveText(/\S/, { timeout: API_TIMEOUT });
    const initialArt = (await pre.textContent())?.trim() ?? '';

    // Click a different algorithm
    await page.click('button:has-text("Mandelbrot")');

    // Art should be regenerated and remain non-whitespace after switching
    await expect(pre).toHaveText(/\S/, { timeout: 15_000 });
    await expect
      .poll(async () => ((await pre.textContent())?.trim() ?? ''), { timeout: 15_000 })
      .not.toBe(initialArt);
  });
});

test.describe('Snake Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/snake');
  });

  test('has heading and back link', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Snake Game');
    await expectBackLink(page);
  });

  test('displays game canvas', async ({ page }) => {
    await expect(page.locator('[data-testid="snake-canvas"]')).toBeVisible();
  });

  test('displays score and high score cards', async ({ page }) => {
    await expect(page.locator('[data-testid="snake-score"]')).toBeVisible();
    await expect(page.locator('[data-testid="snake-highscore"]')).toBeVisible();
  });

  test('displays start button', async ({ page }) => {
    await expect(page.locator('[data-testid="snake-start-btn"]')).toBeVisible();
  });

  test('starts game when start button is clicked', async ({ page }) => {
    await page.click('[data-testid="snake-start-btn"]');
    // Start button should disappear and game-over text should not be visible
    await expect(page.locator('[data-testid="snake-start-btn"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="snake-game-over"]')).not.toBeVisible();
  });

  test('shows how-to-play instructions', async ({ page }) => {
    await expect(page.locator('h2', { hasText: 'How to Play' })).toBeVisible();
  });

  test('shows d-pad controls on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await expect(page.locator('button[aria-label="Move up"]')).toBeVisible();
    await expect(page.locator('button[aria-label="Move left"]')).toBeVisible();
    await expect(page.locator('button[aria-label="Move right"]')).toBeVisible();
    await expect(page.locator('button[aria-label="Move down"]')).toBeVisible();
  });
});

test.describe('Virtual Pet Page', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any persisted pet so each test starts from the hatching screen.
    await page.addInitScript(() => {
      try { localStorage.removeItem('virtual-pet-v1'); } catch { /* ignore */ }
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
    for (const id of ['pet-feed-btn', 'pet-play-btn', 'pet-clean-btn', 'pet-sleep-btn', 'pet-heal-btn']) {
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
