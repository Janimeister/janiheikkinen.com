import { defineConfig } from '@playwright/test';

// This configuration consumes an existing build; it never starts ng serve.
export default defineConfig({
  testDir: './e2e',
  testMatch: 'production.smoke.ts',
  forbidOnly: !!process.env['CI'],
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-production-report', open: 'never' }]],
  use: {
    browserName: 'chromium',
    baseURL: 'http://127.0.0.1:4300',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node scripts/serve-pages.mjs dist/janiheikkinen-com/browser',
    url: 'http://127.0.0.1:4300',
    reuseExistingServer: false,
    timeout: 15_000,
  },
});
