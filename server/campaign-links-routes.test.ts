import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { registerRoutes } from './routes.ts';
import { signCampaignClick, signCampaignReceipt } from './campaign-links.ts';
import { createOrderHandler, processOrder as productionOrder, validateOrder } from '../api/orders.ts';
import { createAbandonedCartHandler, processAbandonedCartCapture as productionCapture } from '../api/abandoned-carts.ts';
import { processOrder as localOrder, orderRequestSchema } from './order-service.ts';
import { processAbandonedCartCapture as localCapture } from './abandoned-cart-service.ts';

const secret = 'test-campaign-context-secret-0123456789abcdef';
const clickId = '11111111-1111-4111-8111-111111111111';
const order = { bundleTitle: 'Honey', bundleDetails: '500g', bundlePrice: 100, quantity: 1, deliveryCharge: 0,
  customerName: 'Test Customer', phone: '01712345678', address: 'House 1 Road 2 Dhaka', paymentMethod: 'cash_on_delivery',
  items: [{ productId: clickId, variantId: clickId, quantity: 1 }] };
const capture = { draftKey: clickId, source: 'storefront', sourcePath: '/checkout', phone: '01712345678',
  items: [{ productName: 'Honey', quantity: 1, unitPrice: 100 }], subtotal: 100, deliveryRate: 0, total: 100,
  campaign: { utmSource: 'facebook', utmCampaign: 'himsagar-reel' } };
for (const platform of ['express', 'vercel'] as const) test(`${platform} forwards only verified cookie attribution on order and capture; malformed optional marketing never rejects commerce`, async () => {
  const previous = process.env.STOREFRONT_CONTEXT_SECRET; process.env.STOREFRONT_CONTEXT_SECRET = secret;
  const calls: Array<{ body: unknown; options: Record<string, unknown> }> = [];
  const submitOrder = async (body: unknown, options = {}) => { calls.push({ body, options }); return { orderRef: 'ML-1', decision: 'allow' as const }; };
  const submitCapture = async (body: unknown, options = {}) => { calls.push({ body, options }); };
  const app = express(); app.use(express.json()); const server = createServer(app);
  if (platform === 'express') await registerRoutes(server, app, { processOrder: submitOrder, processAbandonedCartCapture: submitCapture });
  else {
    app.post('/api/orders', createOrderHandler({ processOrder: submitOrder }));
    app.post('/api/abandoned-carts', createAbandonedCartHandler({ processCapture: submitCapture }));
  }
  server.listen(0, '127.0.0.1'); await once(server, 'listening'); const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  try {
    for (const [path, body] of [['/api/orders', order], ['/api/abandoned-carts', capture]] as const) {
      for (const cookie of [`ml_cclick=${signCampaignClick(clickId, secret)}`, `ml_cclick=${signCampaignClick(clickId, secret)}tampered`, '', `ml_cclick=${signCampaignClick(clickId, secret)}; ml_cclick=${signCampaignClick(clickId, secret)}`]) {
        const result = await fetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', cookie },
          body: JSON.stringify({ ...body, campaignClickId: { forged: true } }) });
        assert.equal(result.status, path === '/api/orders' ? 201 : 202);
        const call = calls.at(-1)!;
        assert.equal(call.options.campaignClickId, cookie.endsWith(signCampaignClick(clickId, secret)) && !cookie.includes(';') ? clickId : undefined);
        assert.equal(Object.hasOwn(call.body as object, 'campaignClickId'), false);
        assert.equal(result.headers.getSetCookie().some(value => value.startsWith('mlbd_did=')), true);
      }
    }
  } finally { server.closeAllConnections(); server.close(); if (previous === undefined) delete process.env.STOREFRONT_CONTEXT_SECRET; else process.env.STOREFRONT_CONTEXT_SECRET = previous; }
});
for (const [label, service, body, path] of [
  ['production order', productionOrder, validateOrder(order), '/api/public/v1/serakhabar/orders'],
  ['local order', localOrder, orderRequestSchema.parse(order), '/api/public/v1/serakhabar/orders'],
  ['production capture', productionCapture, capture, '/api/custom-orders/abandoned-checkouts'],
  ['local capture', localCapture, capture, '/api/custom-orders/abandoned-checkouts'],
] as const) test(`${label} sends internal click option through header, never through browser JSON`, async () => {
  let headers = new Headers(); let payload: Record<string, unknown> = {}; let url = '';
  await service(body as never, { merchantSuiteUrl: 'https://suite.invalid', storefrontHandle: 'serakhabar', apiKey: 'test-api-key',
    clientContextHeader: 'signed.context', campaignClickId: clickId, campaignReceipt: 'signed.receipt',
    fetchImpl: async (target, init) => { url = String(target); headers = new Headers(init?.headers); payload = JSON.parse(String(init?.body)); return new Response(JSON.stringify({ orderRef: 'ML-1' }), { status: 201 }); } });
  assert.equal(url, `https://suite.invalid${path}`); assert.equal(headers.get('x-mlbd-campaign-click-id'), clickId);
  assert.equal(headers.get('x-mlbd-campaign-receipt'), 'signed.receipt');
  assert.equal(headers.get('x-mlbd-client-context'), 'signed.context'); assert.equal(Object.hasOwn(payload, 'campaignClickId'), false);
  if (label.includes('capture')) assert.deepEqual(payload.campaign, capture.campaign);
});
test('Express uses the shared redirect before its catch-all', async () => {
  const app = express(); const server = createServer(app);
  await registerRoutes(server, app, { campaignRedirectOptions: { local: true, merchantSuiteUrl: 'https://suite.invalid', storefrontHandle: 'serakhabar', secret,
    fetchImpl: async () => new Response(JSON.stringify({ clickId, destinationPath: '/product/honey', utm: { utm_source: 'facebook', utm_medium: 'campaign_link', utm_campaign: 'himsagar-reel' } })) } });
  app.use((_req, res) => res.send('SPA'));
  server.listen(0, '127.0.0.1'); await once(server, 'listening'); const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  try {
    for (const method of ['GET', 'HEAD']) {
      const result = await fetch(`${base}/go/himsagar-reel?fbclid=abc`, { method, redirect: 'manual' });
      assert.equal(result.status, 302); assert.equal(result.headers.get('cache-control'), 'no-store');
      assert.equal(result.headers.get('location'), '/product/honey?fbclid=abc&utm_source=facebook&utm_medium=campaign_link&utm_campaign=himsagar-reel');
      assert.equal(result.headers.has('set-cookie'), method === 'GET');
    }
  } finally { server.closeAllConnections(); server.close(); }
});

test('edge-key v1 cookies coexist with legacy v1 cookies and receipt forwarding rejects mismatched IDs', async () => {
  const previousContext = process.env.STOREFRONT_CONTEXT_SECRET;
  const previousEdge = process.env.CAMPAIGN_EDGE_SECRET;
  const edgeSecret = 'new-campaign-edge-secret-test-0123456789';
  process.env.STOREFRONT_CONTEXT_SECRET = secret;
  process.env.CAMPAIGN_EDGE_SECRET = edgeSecret;
  const events = { v: 1, handle: 'serakhabar', linkId: clickId, clickId, clickedAt: new Date().toISOString(), isBot: false,
    visitorHash: null, referrerHost: null, device: 'unknown' };
  const receipt = signCampaignReceipt(events, edgeSecret);
  const calls: Record<string, unknown>[] = [];
  const app = express(); app.use(express.json());
  app.post('/api/orders', createOrderHandler({ processOrder: async (_order, options = {}) => { calls.push(options); return { orderRef: 'ML-2', decision: 'allow' }; } }));
  const server = createServer(app); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  try {
    for (const [id, proof, expectedProof] of [[clickId, receipt, receipt], [clickId, signCampaignReceipt({ ...events, clickId: '22222222-2222-4222-8222-222222222222' }, edgeSecret), undefined]] as const) {
      const response = await fetch(`${base}/api/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json',
        cookie: `ml_cclick=${signCampaignClick(id, edgeSecret)}; ml_cproof=${proof}` }, body: JSON.stringify(order) });
      assert.equal(response.status, 201);
      assert.equal(calls.at(-1)?.campaignClickId, id);
      assert.equal(calls.at(-1)?.campaignReceipt, expectedProof);
    }
  } finally {
    server.closeAllConnections(); server.close();
    if (previousContext === undefined) delete process.env.STOREFRONT_CONTEXT_SECRET; else process.env.STOREFRONT_CONTEXT_SECRET = previousContext;
    if (previousEdge === undefined) delete process.env.CAMPAIGN_EDGE_SECRET; else process.env.CAMPAIGN_EDGE_SECRET = previousEdge;
  }
});
