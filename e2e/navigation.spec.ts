import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Explore navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('cookie-consent', 'accepted');
      localStorage.setItem('app-language', 'en');
    });
    await page.goto('/sorting');
  });

  test('searches names, descriptions and keywords, then navigates and supports browser history', async ({
    page,
  }) => {
    const open = page.getByRole('button', { name: 'Explore', exact: true });
    await open.click();
    const dialog = page.getByRole('dialog');
    const search = dialog.getByRole('searchbox', { name: 'Find a page' });
    await expect(search).toBeFocused();
    await expect(dialog.locator('[aria-current="page"]')).toHaveAttribute('href', '/sorting');
    for (const term of ['Weather', 'forecast', 'temperature']) {
      await search.fill(term);
      await expect(dialog.getByRole('link')).toHaveCount(1);
      await expect(dialog.getByRole('link')).toHaveAttribute('href', '/weather');
    }
    await search.fill('not-a-page');
    await expect(dialog.getByRole('status')).toHaveText('No matching pages. Try another search.');
    await expect(dialog.getByRole('link')).toHaveCount(0);
    await search.fill('games');
    await expect(dialog.getByRole('link')).toHaveCount(2);
    await dialog.locator('a[href="/snake"]').click();
    await expect(page).toHaveURL(/\/snake$/);
    await expect(dialog).not.toBeVisible();
    await expect(page.locator('.current-location')).toHaveText('Snake Game');
    await expect(open).toBeFocused();
    await open.click();
    await expect(search).toHaveValue('');
    await page.goBack();
    await expect(page).toHaveURL(/\/sorting$/);
    await expect(dialog).not.toBeVisible();
    await expect(page.locator('.current-location')).toHaveText('Sorting Algorithms');
  });

  test('contains keyboard focus, supports shortcuts and restores the opener', async ({ page }) => {
    const opener = page.getByRole('button', { name: 'Start', exact: true });
    await opener.focus();
    await page.keyboard.press('Control+k');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('searchbox')).toBeFocused();
    // Cycle beyond the complete set of modal controls in both directions.
    for (const key of ['Tab', 'Shift+Tab']) {
      for (let i = 0; i < 13; i++) {
        await page.keyboard.press(key);
        expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
      }
    }
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(opener).toBeFocused();
    await page.keyboard.press('Meta+k');
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Meta+k');
    await expect(dialog).not.toBeVisible();
    await expect(opener).toBeFocused();
  });

  test('closes on the backdrop and restores page scrolling', async ({ page }) => {
    await page.getByRole('button', { name: 'Explore', exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('hidden');
    await page.mouse.click(5, 5);
    await expect(page.getByRole('dialog')).not.toBeVisible();
    expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('');
  });

  test('does not pass launcher keystrokes to the Snake game', async ({ page }) => {
    await page.goto('/snake');
    await page.getByRole('button', { name: 'Explore', exact: true }).click();
    await page.getByRole('searchbox').press('Enter');
    await page.getByRole('searchbox').press('ArrowDown');
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('snake-start-btn')).toBeVisible();
  });

  test('uses a full-screen mobile dialog with translated search and no overflow', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.getByRole('button', { name: 'Suomi', exact: true }).click();
    await page.getByRole('button', { name: 'Tutustu', exact: true }).click();
    const dialog = page.getByRole('dialog');
    const box = await dialog.boundingBox();
    expect(box?.x).toBe(0);
    expect(box?.width).toBe(320);
    expect(box?.height).toBe(640);
    expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    await page.getByRole('searchbox', { name: 'Etsi sivu' }).fill('  ELÄIN  ');
    await expect(dialog.getByRole('link')).toHaveCount(1);
    await dialog.getByRole('link').click();
    await expect(page).toHaveURL(/\/pet$/);
    await expect(page.locator('h1')).toHaveText('Virtuaalilemmikki');
    await expect(page.getByRole('button', { name: 'Tutustu', exact: true })).toBeFocused();
    expect(
      await page.locator('.header-content').evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
  });

  test('homepage cards expose all destinations and use normal links', async ({ page }) => {
    await page.goto('/');
    const directory = page.locator('app-home app-page-directory');
    await expect(directory.getByRole('link')).toHaveCount(8);
    await expect(directory.getByRole('heading', { level: 3 })).toHaveText([
      'Everyday',
      'Experiments',
      'Play',
      'About',
    ]);
    await directory.locator('a[href="/sorting"]').click();
    await expect(page).toHaveURL(/\/sorting$/);
    await expect(page.locator('h1')).toHaveText('Sorting Algorithms');
  });

  test('Surprise me opens a different experiment or game', async ({ page }) => {
    await page.getByRole('button', { name: 'Explore', exact: true }).click();
    await page.getByRole('button', { name: 'Surprise me', exact: true }).click();
    await expect(page).toHaveURL(/\/(ascii|snake|pet)$/);
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('launcher is accessible on desktop and mobile, including empty results', async ({
    page,
  }) => {
    for (const width of [1280, 375]) {
      await page.setViewportSize({ width, height: 812 });
      await page.getByRole('button', { name: 'Explore', exact: true }).click();
      for (const query of ['', 'not-a-page']) {
        await page.getByRole('searchbox').fill(query);
        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .analyze();
        expect(results.violations).toEqual([]);
      }
      await page.getByRole('button', { name: 'Close', exact: true }).click();
    }
  });
});
