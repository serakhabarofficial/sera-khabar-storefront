import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { createGoHandler } from './go.ts';
const config = { merchantSuiteUrl: 'https://suite.invalid', storefrontHandle: 'serakhabar', secret: 'test-campaign-context-secret-0123456789abcdef', local: true };
test('Vercel navigation is 302/no-store and appends cookie without replacing device cookie', async () => {
  const handler = createGoHandler({ ...config, fetchImpl: async () => new Response(JSON.stringify({ clickId: '11111111-1111-4111-8111-111111111111', destinationPath: '/', utm: { utm_campaign: 'himsagar-reel' } })) });
  const server = createServer((req, res) => { res.setHeader('Set-Cookie', 'mlbd_did=device; HttpOnly'); void handler(req, res); });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const port = (server.address() as { port: number }).port;
  try {
    const result = await fetch(`http://127.0.0.1:${port}/?__campaign_slug=himsagar-reel&slug=himsagar-reel&fbclid=abc`, { redirect: 'manual' });
    assert.equal(result.status, 302); assert.equal(result.headers.get('cache-control'), 'no-store');
    assert.equal(result.headers.getSetCookie().length, 2); assert.match(result.headers.get('location')!, /fbclid=abc/);
    const head = await fetch(`http://127.0.0.1:${port}/go/himsagar-reel`, { method: 'HEAD', redirect: 'manual' });
    assert.equal(head.status, 302); assert.equal(head.headers.getSetCookie().length, 1);
  } finally { server.closeAllConnections(); server.close(); }
});
test('apex navigation canonicalizes before any click/cookie and keeps query', async () => {
  let calls = 0;
  const handler = createGoHandler({ ...config, local: false, fetchImpl: async () => { calls++; throw new Error('unexpected'); } });
  const headers: Record<string, unknown> = {}; let status;
  await handler({ url: '/go/himsagar-reel?fbclid=abc', method: 'GET', headers: { host: 'serakhabar.com' } } as never,
    { setHeader: (key: string, value: unknown) => { headers[key] = value; }, getHeader: () => undefined, set statusCode(code: number) { status = code; }, end() {} } as never);
  assert.equal(calls, 0); assert.equal(status, 302); assert.equal(headers.Location, 'https://www.serakhabar.com/go/himsagar-reel?fbclid=abc');
});
test('Vercel rewrite parameters never escape into the destination, while caller query survives', async () => {
  let location = '';
  const handler = createGoHandler({ ...config, fetchImpl: async () => new Response(JSON.stringify({ destinationPath: '/product/homemade-pumpkin-bori?variant=small', utm: { utm_source: 'facebook', utm_medium: 'campaign_link', utm_campaign: 'bori-campaign-1' } })) });
  await handler({ url: '/?__campaign_slug=bori-campaign-1&slug=bori-campaign-1&slug=customer-value&fbclid=real', method: 'GET', headers: { host: 'www.serakhabar.com' } } as never,
    { setHeader: (key: string, value: unknown) => { if (key === 'Location') location = String(value); }, getHeader: () => undefined, set statusCode(_code: number) {}, end() {} } as never);
  const destination = new URL(location, 'https://www.serakhabar.com');
  assert.equal(destination.pathname, '/product/homemade-pumpkin-bori');
  assert.equal(destination.searchParams.has('__campaign_slug'), false);
  assert.deepEqual(destination.searchParams.getAll('slug'), ['customer-value']);
  assert.equal(destination.searchParams.get('fbclid'), 'real');
  let ordinary = '';
  await handler({ url: '/?slug=customer-value&fbclid=real', method: 'GET', headers: { host: 'www.serakhabar.com' } } as never,
    { setHeader: (key: string, value: unknown) => { if (key === 'Location') ordinary = String(value); }, getHeader: () => undefined, set statusCode(_code: number) {}, end() {} } as never);
  assert.equal(new URL(ordinary, 'https://www.serakhabar.com').searchParams.get('slug'), 'customer-value');
});
