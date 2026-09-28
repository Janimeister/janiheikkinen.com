import base from '/home/user/janiheikkinen.com/playwright.config';
import { defineConfig } from '@playwright/test';
const exe = process.env['PW_CHROMIUM']!;
export default defineConfig({
  ...base,
  testDir: '/home/user/janiheikkinen.com/e2e',
  projects: [{ name: 'chromium', use: { browserName: 'chromium', launchOptions: { executablePath: exe }, ignoreHTTPSErrors: true } }],
});
