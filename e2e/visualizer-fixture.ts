import { test as base, expect } from '@playwright/test';

// Repeatable datasets make screenshots, step counts, and failures reproducible.
export const test = base.extend<{ checkRuntimeErrors: void }>({
  checkRuntimeErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
      });
      await page.addInitScript(() => {
        let seed = 731;
        Math.random = () => {
          seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
          return seed / 4294967296;
        };
      });
      await use();
      expect(errors, 'Visualizer console errors or unhandled exceptions').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
