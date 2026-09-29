import { test, expect } from '@playwright/test';

for (const route of [
  { path: '/', status: 200, selector: 'app-hero h1', text: 'Jani Heikkinen' },
  { path: '/third-party-notices', status: 200, selector: 'h1', text: 'Third-Party Notices' },
  // The committed map asset must ship with the build; live trams are never required.
  { path: '/trams', status: 200, selector: '[data-testid="tram-map"]', text: 'KALLIO' },
  // Unknown addresses still boot the app, from Pages' 404.html, to show its not-found page.
  { path: '/no-such-page', status: 404, selector: 'h1', text: 'Page not found' },
]) {
  test(`Pages artifact boots at ${route.path}`, async ({ page, baseURL }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('response', (response) => {
      if (['script', 'stylesheet', 'font'].includes(response.request().resourceType()) && !response.ok()) {
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

test('every page is served as its own HTML file, with its own metadata', async ({ request }) => {
  const sitemap = await (await request.get('/sitemap.xml')).text();
  const urls = [...sitemap.matchAll(/<loc>https:\/\/janiheikkinen\.com(\/[^<]*)<\/loc>/g)].map(
    (match) => match[1],
  );
  expect(urls).toContain('/searching');
  expect(urls).toContain('/pathfinding');

  const titles = new Set<string>();
  for (const path of urls) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
    const html = await response.text();
    expect(html).toContain(`<link rel="canonical" href="https://janiheikkinen.com${path}">`);
    expect(html).not.toContain('name="robots"');
    titles.add(html.match(/<title>([^<]*)<\/title>/)![1]);
  }
  expect(titles.size).toBe(urls.length);

  const notFound = await request.get('/no-such-page');
  expect(notFound.status()).toBe(404);
  const notFoundHtml = await notFound.text();
  expect(notFoundHtml).toContain('<meta name="robots" content="noindex">');
  expect(notFoundHtml).not.toContain('rel="canonical"');
});
