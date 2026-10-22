import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  // In CI, `github` annotates failures and tests that only passed on a retry (flaky), so a
  // retry can't hide them; `list` keeps the log readable.
  reporter: process.env['CI']
    ? [['list'], ['github'], ['html', { open: 'never' }]]
    : [['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:4200',
    headless: true,
    viewport: { width: 1280, height: 720 },
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
  webServer: {
    command: 'npx ng serve --port 4200',
    port: 4200,
    reuseExistingServer: !process.env['CI'],
    timeout: 60000,
  },
});
