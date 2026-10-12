import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';
import { createCampaignMiddleware, CAMPAIGN_RECEIPT_HEADER, type CampaignRouteCache } from './campaign-middleware.ts';
import { readCampaignClickCookie, readCampaignReceipt } from './campaign-links.ts';
import middleware, { config } from '../middleware.ts';

const SECRET = 'campaign-edge-secret-for-tests-0123456789abcdef';
const CONTEXT_SECRET = 'storefront-context-secret-for-tests-0123456789';
const linkId = '11111111-1111-4111-8111-111111111111';
const NEXT = 'x-test-next';

function routeResponse() {
  return Response.json({ clickId: null, linkId, destinationPath: '/product/homemade-pumpkin-bori?variant=large#buy',
    utm: { utm_source: 'facebook', utm_medium: 'campaign_link', utm_campaign: 'bori-campaign-1' } });
}
function memoryCache() {
  const store = new Map<string, unknown>();
  const sets: Array<{ key: string; tags?: string[]; ttl?: number }> = [];
  const expired: string[][] = [];
  const cache: CampaignRouteCache = {
    async get(key) { return store.get(key); },
    async set(key, value, options) { store.set(key, value); sets.push({ key, ...options }); },
    async expireTag(tag) { expired.push(Array.isArray(tag) ? tag : [tag]); store.clear(); },
  };
  return { cache, sets, expired };
}
function setup(fetchImpl: typeof fetch, overrides: Partial<Parameters<typeof createCampaignMiddleware>[0]> = {}) {
  const pending: Promise<unknown>[] = [];
  const memory = memoryCache();
  const handler = createCampaignMiddleware({
    cache: memory.cache, waitUntil: promise => { pending.push(promise); },
    next: () => new Response(null, { headers: { [NEXT]: '1' } }), clientIp: () => '203.0.113.9',
    merchantSuiteUrl: 'https://suite.invalid', storefrontHandle: 'serakhabar', secret: SECRET, fetchImpl, ...overrides,
  });
  return { handler, pending, ...memory };
}
const get = (path: string, init: RequestInit = {}) => new Request(`https://www.serakhabar.com${path}`, init);
function cookieHeader(response: Response) {
  return response.headers.getSetCookie().map(cookie => cookie.split(';', 1)[0]).join('; ');
}

test('redirects immediately with campaign defaults, unique signed cookies, and background click delivery', async () => {
  const deliveries: string[] = [];
  let releaseDelivery!: () => void;
  const deliveryGate = new Promise<void>(resolve => { releaseDelivery = resolve; });
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith('/campaign-click-events')) {
      deliveries.push(new Headers(init?.headers).get(CAMPAIGN_RECEIPT_HEADER) || '');
      await deliveryGate;
      return new Response(null, { status: 202 });
    }
    assert.equal(init?.method, 'GET');
    return routeResponse();
  }) as typeof fetch;
  const { handler, pending } = setup(fetchImpl);

  const first = await handler(get('/go/bori-campaign-1?utm_campaign=manual&fbclid=abc', { headers: { 'user-agent': 'Mozilla/5.0 (iPhone)' } }));
  const second = await handler(get('/go/bori-campaign-1', { headers: { 'user-agent': 'Mozilla/5.0 (iPhone)' } }));
  assert.equal(first.status, 302);
  assert.equal(first.headers.get('cache-control'), 'no-store');
  const location = new URL(first.headers.get('location')!, 'https://www.serakhabar.com');
  assert.equal(location.pathname, '/product/homemade-pumpkin-bori');
  assert.equal(location.hash, '#buy');
  assert.equal(location.searchParams.get('utm_campaign'), 'manual');
  assert.equal(location.searchParams.get('utm_source'), 'facebook');
  assert.equal(location.searchParams.get('fbclid'), 'abc');

  // The redirect was returned while delivery was still waiting on the Suite.
  assert.equal(deliveries.length, 2);
  releaseDelivery();
  await Promise.all(pending);

  const cookies = { headers: { cookie: cookieHeader(first) } };
  const clickId = readCampaignClickCookie(cookies, CONTEXT_SECRET, SECRET);
  assert.ok(clickId);
  assert.notEqual(clickId, readCampaignClickCookie({ headers: { cookie: cookieHeader(second) } }, CONTEXT_SECRET, SECRET));
  // Storefront checkout accepts the edge receipt and it is the token that was delivered.
  assert.equal(readCampaignReceipt(cookies, SECRET, CONTEXT_SECRET), deliveries[0]);
  const payload = JSON.parse(Buffer.from(deliveries[0].split('.')[0], 'base64url').toString());
  assert.deepEqual(Object.keys(payload).sort(), ['clickId', 'clickedAt', 'device', 'handle', 'isBot', 'linkId', 'referrerHost', 'v', 'visitorHash']);
  assert.equal(payload.device, 'mobile');
  assert.match(payload.visitorHash, /^[a-f0-9]{64}$/);
  assert.doesNotMatch(JSON.stringify(payload), /203\.0\.113|Mozilla/);
});

test('visitor hash matches the Suite formula so daily unique visitors stay consistent', async () => {
  const delivered: string[] = [];
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input).endsWith('/campaign-click-events')) { delivered.push(new Headers(init?.headers).get(CAMPAIGN_RECEIPT_HEADER)!); return new Response(null, { status: 202 }); }
    return routeResponse();
  }) as typeof fetch;
  const now = Date.parse('2026-10-04T20:00:00.000Z');
  const { handler, pending } = setup(fetchImpl, { now: () => now });
  await handler(get('/go/bori-campaign-1', { headers: { 'user-agent': 'UA' } }));
  await Promise.all(pending);
  const payload = JSON.parse(Buffer.from(delivered[0].split('.')[0], 'base64url').toString());
  const expected = createHmac('sha256', SECRET).update(JSON.stringify(['mlbd:campaign-visitor-day:v1', '2026-10-05', '203.0.113.9', 'UA'])).digest('hex');
  assert.equal(payload.visitorHash, expected);
});

test('serves repeat clicks from the route cache with a purge tag', async () => {
  let lookups = 0;
  const fetchImpl = (async (input: RequestInfo | URL) => {
    if (String(input).endsWith('/campaign-click-events')) return new Response(null, { status: 202 });
    lookups++;
    return routeResponse();
  }) as typeof fetch;
  const { handler, pending, sets } = setup(fetchImpl);
  await handler(get('/go/bori-campaign-1'));
  await Promise.all(pending);
  await handler(get('/go/bori-campaign-1'));
  assert.equal(lookups, 1);
  assert.deepEqual(sets.map(entry => entry.tags), [['campaign-bori-campaign-1']]);
  assert.equal(sets[0].ttl, 300);
});

test('HEAD redirects without cookies or a click', async () => {
  const calls: string[] = [];
  const { handler, pending } = setup((async (input: RequestInfo | URL) => { calls.push(String(input)); return routeResponse(); }) as typeof fetch);
  const response = await handler(get('/go/bori-campaign-1', { method: 'HEAD' }));
  await Promise.all(pending);
  assert.equal(response.status, 302);
  assert.equal(response.headers.getSetCookie().length, 0);
  assert.equal(calls.filter(url => url.endsWith('/campaign-click-events')).length, 0);
});

test('bots are counted as bot clicks but never receive attribution cookies', async () => {
  const delivered: string[] = [];
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input).endsWith('/campaign-click-events')) { delivered.push(new Headers(init?.headers).get(CAMPAIGN_RECEIPT_HEADER)!); return new Response(null, { status: 202 }); }
    return routeResponse();
  }) as typeof fetch;
  const { handler, pending } = setup(fetchImpl);
  const response = await handler(get('/go/bori-campaign-1', { headers: { 'user-agent': 'facebookexternalhit/1.1' } }));
  await Promise.all(pending);
  assert.equal(response.status, 302);
  assert.equal(response.headers.getSetCookie().length, 0);
  assert.equal(JSON.parse(Buffer.from(delivered[0].split('.')[0], 'base64url').toString()).isBot, true);
});

test('falls through to the existing Vercel handler when routing is unavailable', async () => {
  const unknown = setup((async () => Response.json({ error: 'not_found' }, { status: 404 })) as typeof fetch);
  assert.equal((await unknown.handler(get('/go/unknown-campaign'))).headers.get(NEXT), '1');
  const down = setup((async () => { throw new Error('suite down'); }) as typeof fetch);
  assert.equal((await down.handler(get('/go/bori-campaign-1'))).headers.get(NEXT), '1');
  const unsigned = setup((async () => routeResponse()) as typeof fetch, { secret: 'short' });
  assert.equal((await unsigned.handler(get('/go/bori-campaign-1'))).headers.get(NEXT), '1');
  const invalid = setup((async () => routeResponse()) as typeof fetch);
  assert.equal((await invalid.handler(get('/go/..%2Fadmin'))).headers.get(NEXT), '1');
  assert.equal((await invalid.handler(get('/go/bori-campaign-1', { method: 'POST' }))).headers.get(NEXT), '1');
  const apex = await invalid.handler(new Request('https://serakhabar.com/go/bori-campaign-1'));
  assert.equal(apex.headers.get(NEXT), '1');
});

test('click delivery retries only temporary Suite failures', async () => {
  const statuses = [503, 202];
  let deliveries = 0;
  const retrying = setup((async (input: RequestInfo | URL) => {
    if (String(input).endsWith('/campaign-click-events')) { deliveries++; return new Response(null, { status: statuses.shift() }); }
    return routeResponse();
  }) as typeof fetch);
  await retrying.handler(get('/go/bori-campaign-1'));
  await Promise.all(retrying.pending);
  assert.equal(deliveries, 2);

  deliveries = 0;
  const rejected = setup((async (input: RequestInfo | URL) => {
    if (String(input).endsWith('/campaign-click-events')) { deliveries++; return new Response(null, { status: 409 }); }
    return routeResponse();
  }) as typeof fetch);
  const warn = console.warn;
  console.warn = () => undefined;
  try {
    const response = await rejected.handler(get('/go/bori-campaign-1'));
    await Promise.all(rejected.pending);
    assert.equal(response.status, 302);
    assert.equal(deliveries, 1);
  } finally { console.warn = warn; }
});

test('cache refresh requires a fresh Suite signature and expires only campaign tags', async () => {
  const { handler, expired } = setup((async () => routeResponse()) as typeof fetch);
  const body = JSON.stringify({ slugs: ['bori-campaign-1', 'Bori-Campaign-1'] });
  const timestamp = String(Date.now());
  const signature = createHmac('sha256', SECRET).update(`campaign-purge-v1:${timestamp}:${body}`).digest('hex');
  const refresh = (sig: string, ts = timestamp) => handler(get('/go/_refresh', { method: 'POST', body,
    headers: { 'x-mlbd-campaign-purge-ts': ts, 'x-mlbd-campaign-purge-signature': sig } }));
  assert.equal((await refresh('0'.repeat(64))).status, 401);
  assert.equal((await refresh(signature, String(Date.now() - 120_000))).status, 401);
  assert.equal(expired.length, 0);
  const accepted = await refresh(signature);
  assert.equal(accepted.status, 202);
  assert.deepEqual(expired, [['campaign-bori-campaign-1']]);
  assert.equal((await handler(get('/go/_refresh'))).status, 405);
});

test('the deployed middleware covers the site for the pre-launch gate and defers without its secrets', async () => {
  assert.deepEqual(config, { runtime: 'nodejs', matcher: ['/:path*'] });
  const previous = process.env.CAMPAIGN_EDGE_SECRET;
  const previousGate = process.env.SITE_ACCESS_PASSWORD;
  delete process.env.CAMPAIGN_EDGE_SECRET;
  delete process.env.SITE_ACCESS_PASSWORD;
  try {
    const response = await middleware(get('/go/bori-campaign-1'), { waitUntil: () => undefined });
    assert.equal(response.headers.get('x-middleware-next'), '1');
    const page = await middleware(get('/products'), { waitUntil: () => undefined });
    assert.equal(page.headers.get('x-middleware-next'), '1');
  } finally {
    if (previous !== undefined) process.env.CAMPAIGN_EDGE_SECRET = previous;
    if (previousGate !== undefined) process.env.SITE_ACCESS_PASSWORD = previousGate;
  }
});
