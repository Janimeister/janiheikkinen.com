// Runs after `ng build` (npm's postbuild). The build prerenders every page to
// `<path>/index.html`; this lays those files out the way GitHub Pages serves them.
//
// - Pages serves `/weather` from `weather.html` with HTTP 200, but answers a directory
//   (`weather/index.html`) with a redirect to `/weather/`. So each page becomes `<path>.html`.
//   The two home pages stay directory indexes, `/` and `/fi/`.
// - The prerendered not-found page (`/404`) becomes `404.html`, which Pages serves, with HTTP
//   404, for every address that has no file. It still boots the app.
// - `sitemap.xml` lists every indexable page with its `hreflang` alternates, read from the
//   pages themselves, so the sitemap can't disagree with them.
import { readdir, readFile, rename, rm, rmdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const dist = resolve(process.argv[2] ?? 'dist/janiheikkinen-com/browser');
const { routes } = JSON.parse(await readFile(resolve(dist, '../prerendered-routes.json'), 'utf8'));

/** Directory indexes: their address ends in a slash, which is also their canonical link. */
const HOME_PAGES = new Set(['/', '/fi']);

/** `weather/index.html` becomes `weather.html`; the then-empty folder goes. */
async function flatten(route) {
  const index = resolve(dist, `.${route}`, 'index.html');
  const file = resolve(dist, `.${route}.html`);
  await rename(index, file);
  if ((await readdir(dirname(index))).length === 0) await rmdir(dirname(index));
  return file;
}

const attribute = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];

const entries = [];
for (const route of Object.keys(routes).sort()) {
  let file;
  if (HOME_PAGES.has(route)) {
    file = resolve(dist, `.${route}`, 'index.html');
    // The Finnish home page is published both ways: `/fi/` is its address, and `fi.html` answers
    // `/fi` on hosts that prefer a file to a folder of the same name.
    if (route !== '/') await writeFile(resolve(dist, `.${route}.html`), await readFile(file));
  } else {
    file = await flatten(route);
  }

  const html = await readFile(file, 'utf8');
  const canonical = html.match(/<link rel="canonical"[^>]*>/)?.[0];
  const noindex = html.includes('<meta name="robots" content="noindex">');
  if (!canonical === !noindex) {
    throw new Error(`${route} must have either a canonical link or a noindex tag`);
  }
  if (noindex) continue;

  const loc = attribute(canonical, 'href');
  if (new URL(loc).pathname !== (HOME_PAGES.has(route) && route !== '/' ? `${route}/` : route)) {
    throw new Error(`${route} was prerendered with the canonical link of another page: ${loc}`);
  }
  const alternates = [...html.matchAll(/<link rel="alternate"[^>]*hreflang[^>]*>/g)].map(
    ([tag]) =>
      `    <xhtml:link rel="alternate" hreflang="${attribute(tag, 'hreflang')}" href="${attribute(tag, 'href')}"/>`,
  );
  entries.push(`  <url>\n    <loc>${loc}</loc>\n${alternates.join('\n')}\n  </url>`);
}

// Unknown addresses get the not-found page; it must exist and stay out of search results.
if (!(await readFile(resolve(dist, '404.html'), 'utf8')).includes('content="noindex"')) {
  throw new Error('404.html must tell search engines not to index it');
}
// The app shell with no page in it; nothing serves it.
await rm(resolve(dist, 'index.csr.html'), { force: true });

await writeFile(
  resolve(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${entries.join('\n')}\n</urlset>\n`,
);

console.log(`Laid out ${entries.length} pages, 404.html and sitemap.xml in ${dist}`);
