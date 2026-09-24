import { test, expect } from '@playwright/test';
import { expectBackLink } from './helpers';

test.describe('Sorting', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('cookie-consent', 'accepted'));
  });
  test('sorts using each algorithm and supports playback controls', async ({ page }) => {
    await page.goto('/sorting');
    await expectBackLink(page);
    await page.getByLabel('Numbers', { exact: false }).fill('5');
    await page.getByLabel('Speed', { exact: false }).fill('100');
    const bars = page.locator('.bar');
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
      expect(
        await bars.evaluateAll((elements) => elements.map((el) => el.getAttribute('data-value'))),
      ).toEqual(original);
    }
  });

  test('supports mobile sizing, pausing and Finnish labels', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/sorting');
    await page.getByLabel('Numbers', { exact: false }).fill('80');
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
