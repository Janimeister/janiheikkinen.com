// Runs after `ng build` (npm's postbuild). GitHub Pages serves `/weather` from `weather.html`
// with HTTP 200, so every page gets its own copy of index.html with its own title, description
// and canonical link. Anything else falls through to 404.html, which still boots the app (for its
// not-found page) but tells search engines not to index it. The sitemap comes from the same list.
//
// Needs Node 23.6+ (or 22.18+) to import the TypeScript registry directly.
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { EN_TRANSLATIONS as en } from '../src/app/i18n/translations.ts';
import {
  canonicalUrl,
  NOT_FOUND_PAGE,
  NOTICES_PAGE,
  pageTitle,
  SITE_PAGES,
} from '../src/app/navigation/page-registry.ts';

const dist = resolve(process.argv[2] ?? 'dist/janiheikkinen-com/browser');
const template = await readFile(resolve(dist, 'index.html'), 'utf8');

const escape = (text) =>
  text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Replaces one attribute of the single tag matching `tag`, failing loudly if it's missing. */
function setAttribute(html, tag, attribute, value) {
  const pattern = new RegExp(`(<${tag}[^>]*\\s${attribute}=")[^"]*(")`);
  if (!pattern.test(html)) throw new Error(`index.html has no <${tag}> with ${attribute}`);
  return html.replace(pattern, `$1${escape(value)}$2`);
}

function render({ path, titleKey, metaKey, noindex }) {
  const title = pageTitle(titleKey ? en[titleKey] : null);
  const description = en[metaKey];
  let html = template.replace(/<title>[^<]*<\/title>/, `<title>${escape(title)}</title>`);
  html = setAttribute(html, 'meta name="description"', 'content', description);
  html = setAttribute(html, 'meta property="og:title"', 'content', title);
  html = setAttribute(html, 'meta property="og:description"', 'content', description);
  html = setAttribute(html, 'meta name="twitter:title"', 'content', title);
  html = setAttribute(html, 'meta name="twitter:description"', 'content', description);
  if (noindex) {
    return html
      .replace(/\s*<link rel="canonical"[^>]*>/, '')
      .replace(/\s*<meta property="og:url"[^>]*>/, '')
      .replace('</head>', '  <meta name="robots" content="noindex">\n</head>');
  }
  const url = canonicalUrl(`/${path}`);
  html = setAttribute(html, 'link rel="canonical"', 'href', url);
  return setAttribute(html, 'meta property="og:url"', 'content', url);
}

const pages = [...SITE_PAGES, NOTICES_PAGE];
for (const page of pages) {
  await writeFile(resolve(dist, page.path ? `${page.path}.html` : 'index.html'), render(page));
}
await writeFile(resolve(dist, '404.html'), render(NOT_FOUND_PAGE));

const urls = pages.map((page) => `  <url><loc>${canonicalUrl(`/${page.path}`)}</loc></url>`);
await writeFile(
  resolve(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`,
);

console.log(`Wrote ${pages.length} pages, 404.html and sitemap.xml to ${dist}`);
