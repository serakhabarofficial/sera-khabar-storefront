import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { readAnalyticsSessionCookie, readAnalyticsVisitorCookie } from './analytics-session.ts';
import { registerRoutes } from './routes.ts';
import { createOrderHandler, processOrder as productionOrder, validateOrder } from '../api/orders.ts';
import { processOrder as localOrder, orderRequestSchema } from './order-service.ts';
import { createAbandonedCartHandler, processAbandonedCartCapture as productionCapture } from '../api/abandoned-carts.ts';
import { processAbandonedCartCapture as localCapture } from './abandoned-cart-service.ts';

const visit = '9f8e7d6c-5b4a-4c3d-9e2f-1a0b9c8d7e6f';
const product = '11111111-1111-4111-8111-111111111111';
const order = { bundleTitle: 'Honey', bundleDetails: '500g', bundlePrice: 100, quantity: 1, deliveryCharge: 0,
  customerName: 'Test Customer', phone: '01712345678', address: 'House 1 Road 2 Dhaka', paymentMethod: 'cash_on_delivery',
  items: [{ productId: product, variantId: product, quantity: 1 }] };

test('reads one well-formed tracker visit cookie only', () => {
  const read = (cookie: string) => readAnalyticsSessionCookie({ headers: { cookie } });
  assert.equal(read(`ms_vid=x; ms_sid=${visit.toUpperCase()}`), visit);
  assert.equal(read(`ms_sid=${visit}; ms_sid=${visit}`), undefined);
  assert.equal(read('ms_sid=not-a-visit'), undefined);
  assert.equal(read(''), undefined);
});

for (const platform of ['express', 'vercel'] as const) test(`${platform} order route passes the visit cookie to the Suite call`, async () => {
  const calls: Array<Record<string, unknown>> = [];
  const submitOrder = async (_body: unknown, options = {}) => { calls.push(options); return { orderRef: 'ML-1', decision: 'allow' as const }; };
  const app = express(); app.use(express.json()); const server = createServer(app);
  if (platform === 'express') await registerRoutes(server, app, { processOrder: submitOrder });
  else app.post('/api/orders', createOrderHandler({ processOrder: submitOrder }));
  server.listen(0, '127.0.0.1'); await once(server, 'listening'); const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  try {
    for (const cookie of [`ms_sid=${visit}`, 'ms_sid=forged', '']) {
      const result = await fetch(`${base}/api/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json', cookie }, body: JSON.stringify(order) });
      assert.equal(result.status, 201);
      assert.equal(calls.at(-1)!.analyticsSessionId, cookie === `ms_sid=${visit}` ? visit : undefined);
    }
  } finally { server.closeAllConnections(); server.close(); }
});

for (const [label, service, body] of [
  ['production', productionOrder, validateOrder(order)],
  ['local', localOrder, orderRequestSchema.parse(order)],
] as const) test(`${label} order service sends the visit as a header, never in the order body`, async () => {
  let headers = new Headers(); let payload: Record<string, unknown> = {};
  await service(body as never, { merchantSuiteUrl: 'https://suite.invalid', storefrontHandle: 'serakhabar', analyticsSessionId: visit,
    fetchImpl: async (_target, init) => { headers = new Headers(init?.headers); payload = JSON.parse(String(init?.body)); return new Response(JSON.stringify({ orderRef: 'ML-1' }), { status: 201 }); } });
  assert.equal(headers.get('x-mlbd-analytics-session-id'), visit);
  assert.equal(JSON.stringify(payload).includes(visit), false);
});

// Abandoned checkouts turned into orders by staff are linked to the visit that captured them.
const capture = { draftKey: product, source: 'storefront', sourcePath: '/checkout', phone: '01712345678',
  items: [{ productName: 'Honey', quantity: 1, unitPrice: 100 }], subtotal: 100, deliveryRate: 0, total: 100 };

for (const platform of ['express', 'vercel'] as const) test(`${platform} capture route passes the visit cookie to the Suite call`, async () => {
  const calls: Array<Record<string, unknown>> = [];
  const submitCapture = async (_body: unknown, options = {}) => { calls.push(options); };
  const app = express(); app.use(express.json()); const server = createServer(app);
  if (platform === 'express') await registerRoutes(server, app, { processAbandonedCartCapture: submitCapture });
  else app.post('/api/abandoned-carts', createAbandonedCartHandler({ processCapture: submitCapture }));
  server.listen(0, '127.0.0.1'); await once(server, 'listening'); const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  try {
    for (const cookie of [`ms_sid=${visit}`, 'ms_sid=forged', '']) {
      const result = await fetch(`${base}/api/abandoned-carts`, { method: 'POST', headers: { 'Content-Type': 'application/json', cookie }, body: JSON.stringify(capture) });
      assert.equal(result.status, 202);
      assert.equal(calls.at(-1)!.analyticsSessionId, cookie === `ms_sid=${visit}` ? visit : undefined);
    }
  } finally { server.closeAllConnections(); server.close(); }
});

for (const [label, service] of [['production', productionCapture], ['local', localCapture]] as const) test(`${label} capture service sends the visit as a header, never in the body`, async () => {
  let headers = new Headers(); let payload = '';
  await service(capture as never, { merchantSuiteUrl: 'https://suite.invalid', apiKey: 'test-api-key', analyticsSessionId: visit,
    fetchImpl: async (_target, init) => { headers = new Headers(init?.headers); payload = String(init?.body); return new Response('{}', { status: 201 }); } });
  assert.equal(headers.get('x-mlbd-analytics-session-id'), visit);
  assert.equal(payload.includes(visit), false);
});

test('the default Vercel capture handler forwards the visit all the way to the Suite', async () => {
  const previous = { url: process.env.MERCHANT_SUITE_URL, key: process.env.CUSTOM_ORDERS_API_KEY, fetch: globalThis.fetch };
  process.env.MERCHANT_SUITE_URL = 'https://suite.invalid'; process.env.CUSTOM_ORDERS_API_KEY = 'test-api-key';
  let headers = new Headers();
  globalThis.fetch = (async (_target: unknown, init?: RequestInit) => { headers = new Headers(init?.headers); return new Response('{}', { status: 201 }); }) as typeof fetch;
  const app = express(); app.use(express.json()); app.post('/api/abandoned-carts', createAbandonedCartHandler());
  const server = createServer(app); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  try {
    const result = await previous.fetch(`${base}/api/abandoned-carts`, { method: 'POST', headers: { 'Content-Type': 'application/json', cookie: `ms_sid=${visit}` }, body: JSON.stringify(capture) });
    assert.equal(result.status, 202);
    assert.equal(headers.get('x-mlbd-analytics-session-id'), visit);
  } finally {
    server.closeAllConnections(); server.close(); globalThis.fetch = previous.fetch;
    if (previous.url === undefined) delete process.env.MERCHANT_SUITE_URL; else process.env.MERCHANT_SUITE_URL = previous.url;
    if (previous.key === undefined) delete process.env.CUSTOM_ORDERS_API_KEY; else process.env.CUSTOM_ORDERS_API_KEY = previous.key;
  }
});

// A returning visit is recognised by the tracker's per-browser ms_vid cookie, forwarded as a header only.
const browser = '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d';

test('reads one well-formed tracker browser cookie only', () => {
  const read = (cookie: string) => readAnalyticsVisitorCookie({ headers: { cookie } });
  assert.equal(read(`ms_sid=${visit}; ms_vid=${browser.toUpperCase()}`), browser);
  assert.equal(read(`ms_vid=${browser}; ms_vid=${browser}`), undefined);
  assert.equal(read('ms_vid=not-a-browser'), undefined);
  assert.equal(read(''), undefined);
});

const returningVisit = { draftKey: product, source: 'landing', sourcePath: '/step/am-sotto-achar', returningVisit: true,
  items: [{ productName: 'Honey', quantity: 1, unitPrice: 100 }], subtotal: 100, deliveryRate: 0, total: 100 };

for (const platform of ['express', 'vercel'] as const) test(`${platform} capture route passes the browser cookie with a returning visit`, async () => {
  const calls: Array<Record<string, unknown>> = [];
  const submitCapture = async (_body: unknown, options = {}) => { calls.push(options); };
  const app = express(); app.use(express.json()); const server = createServer(app);
  if (platform === 'express') await registerRoutes(server, app, { processAbandonedCartCapture: submitCapture });
  else app.post('/api/abandoned-carts', createAbandonedCartHandler({ processCapture: submitCapture }));
  server.listen(0, '127.0.0.1'); await once(server, 'listening'); const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  try {
    for (const cookie of [`ms_vid=${browser}`, 'ms_vid=forged', '']) {
      const result = await fetch(`${base}/api/abandoned-carts`, { method: 'POST', headers: { 'Content-Type': 'application/json', cookie }, body: JSON.stringify(returningVisit) });
      assert.equal(result.status, 202);
      assert.equal(calls.at(-1)!.analyticsVisitorId, cookie === `ms_vid=${browser}` ? browser : undefined);
    }
  } finally { server.closeAllConnections(); server.close(); }
});

for (const [label, service] of [['production', productionCapture], ['local', localCapture]] as const) test(`${label} capture service sends the browser as a header, never in the body`, async () => {
  let headers = new Headers(); let payload = '';
  await service(returningVisit as never, { merchantSuiteUrl: 'https://suite.invalid', apiKey: 'test-api-key', analyticsVisitorId: browser,
    fetchImpl: async (_target, init) => { headers = new Headers(init?.headers); payload = String(init?.body); return new Response('{}', { status: 201 }); } });
  assert.equal(headers.get('x-mlbd-analytics-visitor-id'), browser);
  assert.equal(payload.includes(browser), false);
});
