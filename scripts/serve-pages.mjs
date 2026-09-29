// Serve only the built artifact the way GitHub Pages does, including its 404.html fallback.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';

const root = resolve(process.argv[2]);
const types = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.xml': 'application/xml', '.txt': 'text/plain', '.md': 'text/markdown',
};
// Like Pages: a directory serves its index.html, and `/weather` serves `weather.html`.
async function pagesFile(file) {
  let stats;
  try {
    stats = await stat(file);
  } catch {
    await stat(`${file}.html`);
    return `${file}.html`;
  }
  if (!stats.isDirectory()) return file;
  const index = resolve(file, 'index.html');
  await stat(index);
  return index;
}

// Fail before accepting connections if the build or Pages fallback is missing.
await Promise.all(['index.html', '404.html'].map((file) => stat(resolve(root, file))));

createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    let file = resolve(root, `.${pathname}`);
    if (file !== root && !file.startsWith(root + sep)) {
      response.writeHead(403).end();
      return;
    }
    let status = 200;
    try {
      file = await pagesFile(file);
    } catch {
      // Real Pages deep links boot the SPA from a response with HTTP status 404.
      file = resolve(root, '404.html');
      status = 404;
    }
    const body = await readFile(file);
    response.writeHead(status, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' });
    response.end(body);
  } catch {
    response.writeHead(500).end();
  }
}).listen(4300, '127.0.0.1');
