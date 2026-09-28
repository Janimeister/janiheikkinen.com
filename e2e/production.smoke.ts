import { test, expect } from '@playwright/test';

for (const route of [
  { path: '/', status: 200, selector: 'app-hero h1', text: 'Jani Heikkinen' },
  { path: '/third-party-notices', status: 404, selector: 'h1', text: 'Third-Party Notices' },
  // The committed map asset must ship with the build; live trams are never required.
  { path: '/trams', status: 404, selector: '[data-testid="tram-map"]', text: 'KALLIO' },
]) {
  test(`Pages artifact boots at ${route.path}`, async ({ page, baseURL }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('response', (response) => {
      if (['script', 'stylesheet'].includes(response.request().resourceType()) && !response.ok()) {
        errors.push(`Asset failed: ${response.status()} ${response.url()}`);
      }
    });
    // Check the artifact independently of third-party APIs and font services.
    await page.route('**/*', (request) =>
      new URL(request.request().url()).origin === baseURL ? request.continue() : request.abort(),
    );
    const response = await page.goto(route.path);
    expect(response?.status()).toBe(route.status);
    await expect(page.locator(route.selector)).toContainText(route.text);
    expect(errors).toEqual([]);
  });
}
