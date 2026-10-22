// The Worker's own handling: origins and CORS, methods, the key, body size, the query allowlist
// and what goes upstream. Runs with `node --test` (Node 24 imports the TypeScript allowlist
// directly); allowedRequest() itself is covered in src/app/departures/digitransit.spec.ts.
import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { boardRequest, searchRequest, SEARCH_QUERY } from '../../src/app/departures/digitransit.ts';
import worker from './worker.js';

const SITE = 'https://janiheikkinen.com';
const ENV = { DIGITRANSIT_SUBSCRIPTION_KEY: 'test-key' };

/** Upstream requests the Worker made, answered with `{ data: {} }`. */
let upstream;
const realFetch = globalThis.fetch;

beforeEach(() => {
  upstream = [];
  globalThis.fetch = async (url, init) => {
    upstream.push({ url, init });
    return new Response('{"data":{}}', {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  };
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

function call({ body, origin = SITE, method = 'POST', env = ENV } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (origin) headers.Origin = origin;
  const payload = body === undefined || typeof body === 'string' ? body : JSON.stringify(body);
  return worker.fetch(
    new Request('https://digitransit-proxy.example/', { method, headers, body: payload }),
    env,
  );
}

describe('origins', () => {
  it('answers the site, www and localhost with CORS headers', async () => {
    for (const origin of [SITE, 'https://www.janiheikkinen.com', 'http://localhost:4200']) {
      const response = await call({ body: searchRequest('kamppi'), origin });
      assert.equal(response.status, 200, origin);
      assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin);
      assert.equal(response.headers.get('Vary'), 'Origin');
    }
  });

  it('refuses other origins and requests without one, before going upstream', async () => {
    for (const origin of ['https://evil.example', 'https://janiheikkinen.com.evil.example', null]) {
      const response = await call({ body: searchRequest('kamppi'), origin });
      assert.equal(response.status, 403, String(origin));
      assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
    }
    assert.equal(upstream.length, 0);
  });

  it('answers a preflight from the site and refuses one from elsewhere', async () => {
    const ok = await call({ method: 'OPTIONS' });
    assert.equal(ok.status, 204);
    assert.equal(ok.headers.get('Access-Control-Allow-Methods'), 'POST, OPTIONS');
    assert.equal(ok.headers.get('Access-Control-Allow-Headers'), 'Content-Type');
    assert.equal((await call({ method: 'OPTIONS', origin: 'https://evil.example' })).status, 403);
  });
});

describe('requests', () => {
  it('forwards the page’s queries with the key and nothing but query and variables', async () => {
    for (const request of [
      searchRequest('kamppi'),
      boardRequest('stop', 'HSL:1130446'),
      boardRequest('station', 'HSL:1000202'),
    ]) {
      upstream = [];
      const response = await call({ body: { ...request, operationName: 'X', extensions: {} } });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('Cache-Control'), 'no-store');
      assert.deepEqual(await response.json(), { data: {} });

      assert.equal(upstream.length, 1);
      const [{ url, init }] = upstream;
      assert.equal(url, 'https://api.digitransit.fi/routing/v2/hsl/gtfs/v1');
      assert.equal(init.headers['digitransit-subscription-key'], 'test-key');
      assert.deepEqual(JSON.parse(init.body), request);
    }
  });

  it('refuses other queries, bad variables and bodies that are not JSON', async () => {
    const cases = [
      { query: 'query Search { agencies { name } }', variables: { name: 'kamppi' } },
      {
        query: `${SEARCH_QUERY} query Other { agencies { name } }`,
        variables: { name: 'kamppi' },
        operationName: 'Other',
      },
      { ...boardRequest('stop', 'HSL:1'), variables: { id: 'HSL:1', count: 100 } },
      'not json',
    ];
    for (const body of cases) {
      const response = await call({ body });
      assert.equal(response.status, 400, JSON.stringify(body).slice(0, 60));
      assert.ok((await response.json()).errors[0].message);
    }
    assert.equal(upstream.length, 0);
  });

  it('refuses other methods, large bodies and a missing key', async () => {
    assert.equal((await call({ method: 'GET' })).status, 405);
    assert.equal((await call({ body: 'x'.repeat(4097) })).status, 413);
    assert.equal((await call({ body: searchRequest('kamppi'), env: {} })).status, 500);
    assert.equal(upstream.length, 0);
  });

  it('passes upstream errors through with their status', async () => {
    globalThis.fetch = async () =>
      new Response('{"errors":[{"message":"limit"}]}', {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    const response = await call({ body: searchRequest('kamppi') });
    assert.equal(response.status, 429);
    assert.equal(response.headers.get('Content-Type'), 'application/json');
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), SITE);
  });
});
