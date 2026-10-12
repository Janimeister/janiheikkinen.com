import { expect, failApi, freezeClock, test } from './api-mocks';
import { TIME_ZONE } from './fixtures/api-data';
import { expectBackLink } from './helpers';

// "today" and "3 days ago" are measured from the frozen clock.
test.use({ timezoneId: TIME_ZONE });

test.describe('GitHub Page', () => {
  test.beforeEach(async ({ page }) => {
    await freezeClock(page);
  });

  test('has heading and back link', async ({ page }) => {
    await page.goto('/github');
    await expect(page.locator('h1')).toContainText('GitHub Profile');
    await expectBackLink(page);
  });

  test('shows the profile and its numbers', async ({ page }) => {
    await page.goto('/github');
    const main = page.locator('main');
    await expect(main.getByRole('heading', { name: 'Jani Heikkinen' })).toBeVisible();
    await expect(main.getByText('Builds small things for the web.')).toBeVisible();
    await expect(main.getByText('Member since 2016')).toBeVisible();
    // A bare domain becomes a link with a scheme.
    await expect(main.locator('a', { hasText: 'janiheikkinen.com' }).first()).toHaveAttribute(
      'href',
      'https://janiheikkinen.com',
    );
    const stats = main
      .locator('app-glow-card')
      .filter({ has: page.getByRole('heading', { name: 'Stats' }) });
    await expect(stats).toContainText(/3\s*Repositories/);
    await expect(stats).toContainText(/12\s*Followers/);
  });

  test('lists own repositories, newest first, and their languages', async ({ page }) => {
    await page.goto('/github');
    const repos = page.getByTestId('repo');
    // The fork is left out.
    await expect(repos).toHaveCount(3);
    await expect(repos.nth(0)).toContainText('janiheikkinen.com');
    await expect(repos.nth(0)).toContainText('⭐ 3');
    await expect(repos.nth(1)).toContainText('dotfiles');
    await expect(repos.nth(2)).toContainText('pixel-garden');
    await expect(page.locator('main')).not.toContainText('forked-lib');

    const languages = page
      .locator('app-glow-card')
      .filter({ has: page.getByRole('heading', { name: 'Languages' }) });
    await expect(languages).toContainText(/TypeScript\s*\(2\)/);
    await expect(languages).toContainText(/JavaScript\s*\(1\)/);
    await expect(languages).not.toContainText('Rust');
  });

  test('shows recent activity with relative dates', async ({ page }) => {
    await page.goto('/github');
    const activity = page.getByTestId('activity');
    await expect(activity).toHaveCount(2);
    await expect(activity.nth(0)).toContainText(/Pushed to\s*janiheikkinen\.com/);
    await expect(activity.nth(0)).toContainText('today');
    await expect(activity.nth(1)).toContainText(/Starred\s*awesome-list/);
    await expect(activity.nth(1)).toContainText('3 days ago');
  });

  test('explains a rate-limited profile request', async ({ page }) => {
    await failApi(page, 'githubUser', 403);
    await page.goto('/github');
    await expect(page.getByText('Could not load GitHub data.', { exact: false })).toBeVisible();
  });

  test('keeps the profile when only repositories or activity fail', async ({ page }) => {
    await failApi(page, 'githubRepos');
    await failApi(page, 'githubEvents');
    await page.goto('/github');
    await expect(page.getByRole('heading', { name: 'Jani Heikkinen' })).toBeVisible();
    await expect(page.getByText('Could not load repositories.', { exact: false })).toBeVisible();
    await expect(page.getByText('Could not load recent activity.', { exact: false })).toBeVisible();
    await expect(page.getByTestId('repo')).toHaveCount(0);
  });
});
