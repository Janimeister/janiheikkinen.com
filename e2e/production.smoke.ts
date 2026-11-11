import { test, expect } from '@playwright/test';

for (const route of [
  { path: '/', status: 200, selector: 'app-hero h1', text: 'Jani Heikkinen' },
  { path: '/third-party-notices', status: 200, selector: 'h1', text: 'Third-Party Notices' },
  // The committed map asset must ship with the build; live trams are never required.
  { path: '/trams', status: 200, selector: '[data-testid="tram-map"]', text: 'KALLIO' },
  // Finnish pages are files of their own, under /fi.
  { path: '/fi/', status: 200, selector: 'app-home h2', text: 'Mitä haluat tutkia?' },
  { path: '/fi/weather', status: 200, selector: 'h1', text: 'Sääolosuhteet' },
  // Unknown addresses still boot the app, from Pages' 404.html, to show its not-found page.
  { path: '/no-such-page', status: 404, selector: 'h1', text: 'Page not found' },
  // The same English file answers under /fi; the app then shows it in Finnish.
  { path: '/fi/no-such-page', status: 404, selector: 'h1', text: 'Sivua ei löytynyt' },
]) {
  test(`Pages artifact boots at ${route.path}`, async ({ page, baseURL }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    // The app must take the prerendered page over as it is, not find it different and redraw it.
    page.on('console', (message) => {
      if (message.type() === 'error' && /NG0?5\d\d|hydrat/i.test(message.text())) {
        errors.push(message.text());
      }
    });
    page.on('response', (response) => {
      if (
        ['script', 'stylesheet', 'font'].includes(response.request().resourceType()) &&
        !response.ok()
      ) {
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
  expect(urls).toContain('/');
  expect(urls).toContain('/searching');
  expect(urls).toContain('/pathfinding');
  // Finnish pages too; only the Finnish home page is a folder, so only it ends in a slash.
  expect(urls).toContain('/fi/');
  expect(urls).toContain('/fi/searching');
  expect(urls.filter((path) => path.startsWith('/fi/'))).toHaveLength(urls.length / 2);
  expect(urls).not.toContain('/404');
  expect(sitemap).toContain(
    '<xhtml:link rel="alternate" hreflang="fi" href="https://janiheikkinen.com/fi/weather"/>',
  );

  const titles = new Set<string>();
  for (const path of urls) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
    const html = await response.text();
    expect(html).toContain(`<link rel="canonical" href="https://janiheikkinen.com${path}">`);
    expect(html).toContain(`<html lang="${path.startsWith('/fi/') ? 'fi' : 'en'}"`);
    expect(html.match(/<link rel="alternate"[^>]*hreflang/g), path).toHaveLength(3);
    expect(html).not.toContain('name="robots"');
    // The page itself is in the file, not just a shell for the app to fill in.
    expect(html, path).toMatch(/<main[^>]*>.*<h1/s);
    titles.add(
      `${path.startsWith('/fi/') ? 'fi' : 'en'} ${html.match(/<title>([^<]*)<\/title>/)![1]}`,
    );
  }
  expect(titles.size).toBe(urls.length);

  // `/fi` without the slash is answered too, by the same page.
  const finnishHome = await request.get('/fi');
  expect(finnishHome.status()).toBe(200);
  expect(await finnishHome.text()).toContain(
    '<link rel="canonical" href="https://janiheikkinen.com/fi/">',
  );

  const notFound = await request.get('/no-such-page');
  expect(notFound.status()).toBe(404);
  const notFoundHtml = await notFound.text();
  expect(notFoundHtml).toContain('<meta name="robots" content="noindex">');
  expect(notFoundHtml).not.toContain('rel="canonical"');
  expect(notFoundHtml).toContain('Page not found');
});

test('pages are written without live data, which loads in the browser', async ({ request }) => {
  for (const path of ['/weather', '/electricity', '/github', '/trams']) {
    const html = await (await request.get(path)).text();
    const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
    expect(main, path).toContain('animate-pulse');
    expect(main, path).not.toContain('text-red-400');
  }
});
