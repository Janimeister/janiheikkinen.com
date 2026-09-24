import { test, expect } from '@playwright/test';
import { expectBackLink } from './helpers';

test.describe('Sorting', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('cookie-consent', 'accepted'));
  });
  test('sorts using each algorithm and supports playback controls', async ({ page }) => {
    await page.goto('/sorting');
    await expectBackLink(page);
    await page.getByRole('slider', { name: /^Numbers:/ }).press('Home');
    await page.getByRole('slider', { name: /^Speed:/ }).press('End');
    const bars = page.locator('.bar');
    await expect(bars).toHaveCount(5);
    const original = await bars.evaluateAll((elements) =>
      elements.map((el) => el.getAttribute('data-value')),
    );
    for (const algorithm of ['bubble', 'merge']) {
      await page.getByLabel('Algorithm', { exact: true }).selectOption(algorithm);
      await page.getByRole('button', { name: 'Single step', exact: true }).click();
      await expect(page.getByRole('status')).toHaveText('Paused');
      await page.getByRole('button', { name: 'Resume', exact: true }).click();
      await expect(page.getByRole('status')).toHaveText('Sorted!');
      expect(
        await bars.evaluateAll((elements) =>
          elements.map((el) => Number(el.getAttribute('data-value'))),
        ),
      ).toEqual([1, 2, 3, 4, 5]);
      await page.getByRole('button', { name: 'Reset', exact: true }).click();
      await expect
        .poll(() =>
          bars.evaluateAll((elements) => elements.map((el) => el.getAttribute('data-value'))),
        )
        .toEqual(original);
    }
  });

  test('shows complexity and an elapsed timer that pauses and resets', async ({ page }) => {
    await page.clock.install();
    await page.goto('/sorting');
    const timer = page.getByRole('timer', { name: 'Elapsed animation time' });
    await expect(timer).toContainText('0.00 s');
    const table = page.getByRole('table', { name: 'Time complexity' });
    await expect(
      table.getByRole('row', { name: 'Bubble Sort O(n) O(n²) O(n²)', exact: true }),
    ).toBeVisible();
    await expect(
      table.getByRole('row', { name: 'Merge Sort O(n log n) O(n log n) O(n log n)', exact: true }),
    ).toBeVisible();
    await page.getByRole('slider', { name: /^Speed:/ }).press('Home');
    await page.getByRole('button', { name: 'Start', exact: true }).click();
    await page.clock.runFor(500);
    await expect(timer).not.toContainText('0.00 s');
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await expect(page.getByRole('status')).toHaveText('Paused');
    const paused = await timer.textContent();
    await page.clock.runFor(2000);
    await expect(timer).toHaveText(paused!);
    await page.getByRole('button', { name: 'Single step', exact: true }).click();
    await expect(timer).toHaveText(paused!);
    await page.getByRole('button', { name: 'Reset', exact: true }).click();
    await expect(timer).toContainText('0.00 s');
  });

  test('supports mobile sizing, pausing and Finnish labels', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/sorting');
    await page.getByRole('slider', { name: /^Numbers:/ }).press('End');
    await expect(page.locator('.bar')).toHaveCount(80);
    await page.getByRole('button', { name: 'Start', exact: true }).click();
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await expect(page.getByRole('status')).toHaveText('Paused');
    await page.getByRole('button', { name: 'Shuffle', exact: true }).click();
    await expect(page.getByRole('status')).toHaveText('Ready');
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.getByRole('button', { name: 'Suomi', exact: true }).click();
    await expect(page.locator('h1')).toHaveText('Lajittelualgoritmit');
  });
});
