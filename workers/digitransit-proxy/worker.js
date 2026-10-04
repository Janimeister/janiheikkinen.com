// Cloudflare Worker in front of the Digitransit routing API for /departures. It adds the
// subscription key, which must stay out of the browser bundle, and only forwards the site's own
// queries from the site's own origins. Deploy with `npx wrangler deploy` from this folder, after
// `npx wrangler secret put DIGITRANSIT_SUBSCRIPTION_KEY`.

const UPSTREAM = 'https://api.digitransit.fi/routing/v2/hsl/gtfs/v1';

const ALLOWED_ORIGINS = new Set(['https://janiheikkinen.com', 'https://www.janiheikkinen.com']);
const LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

/** The operations in src/app/departures/digitransit.ts; anything else is refused. */
const ALLOWED_OPERATIONS = new Set(['Search', 'StopDepartures', 'StationDepartures']);

const MAX_BODY_BYTES = 4096;

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') ?? '';
    const allowed = ALLOWED_ORIGINS.has(origin) || LOCAL_ORIGIN.test(origin);
    const cors = allowed
      ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' }
      : { Vary: 'Origin' };

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: allowed ? 204 : 403,
        headers: {
          ...cors,
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      });
    }
    if (!allowed) return error(403, 'Origin not allowed', cors);
    if (request.method !== 'POST') return error(405, 'Use POST', cors);
    if (!env.DIGITRANSIT_SUBSCRIPTION_KEY) return error(500, 'Proxy has no key', cors);

    const body = await request.text();
    if (new TextEncoder().encode(body).length > MAX_BODY_BYTES) {
      return error(413, 'Request too large', cors);
    }
    let query;
    try {
      ({ query } = JSON.parse(body));
    } catch {
      return error(400, 'Body must be JSON', cors);
    }
    const operation = typeof query === 'string' ? /^\s*query\s+(\w+)/.exec(query)?.[1] : null;
    if (!operation || !ALLOWED_OPERATIONS.has(operation)) {
      return error(400, 'Unknown operation', cors);
    }

    const upstream = await fetch(UPSTREAM, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'digitransit-subscription-key': env.DIGITRANSIT_SUBSCRIPTION_KEY,
      },
      body,
    });
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        ...cors,
        'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  },
};

function error(status, message, headers) {
  return new Response(JSON.stringify({ errors: [{ message }] }), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}
