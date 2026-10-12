import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import type { IncomingHttpHeaders } from 'node:http';
import { CLIENT_CONTEXT_HEADER, createSignedClientContext } from './client-context.js';

const ORIGIN = 'https://www.serakhabar.com';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UNSAFE = /[\\\u0000-\u001f\u007f]/;
export const CAMPAIGN_CLICK_HEADER = 'x-mlbd-campaign-click-id';
export const CAMPAIGN_RECEIPT_HEADER = 'x-mlbd-campaign-receipt';
export type CampaignRequest = { url?: string; method?: string; headers: IncomingHttpHeaders; socket?: { remoteAddress?: string } };
export type CampaignRedirectOptions = { fetchImpl?: typeof fetch; merchantSuiteUrl?: string; storefrontHandle?: string; secret?: string; local?: boolean };

export function normalizeCampaignSlug(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const slug = value.trim().toLowerCase();
  return slug.length >= 3 && slug.length <= 60 && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) ? slug : undefined;
}
// Keep the independent storefront check aligned with the Suite path contract.
export function normalizeCampaignDestination(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length > 200 || !value.startsWith('/') || value.startsWith('//') || UNSAFE.test(value)) return undefined;
  try {
    if (UNSAFE.test(decodeURIComponent(value))) return undefined;
    let path = value.split(/[?#]/, 1)[0];
    for (let depth = 0; depth < 8; depth++) {
      if (!path.startsWith('/') || path.startsWith('//') || UNSAFE.test(path) || /%2f|%3f|%23/i.test(path)) return undefined;
      const parsed = new URL(path, ORIGIN);
      if (parsed.origin !== ORIGIN || parsed.pathname.startsWith('//') || /^\/go(?:\/|$)/i.test(parsed.pathname)) return undefined;
      const decoded = /%[0-9a-f]{2}/i.test(path) ? decodeURIComponent(path) : path;
      if (decoded === path) {
        const url = new URL(value, ORIGIN);
        const result = `${url.pathname}${url.search}${url.hash}`;
        return url.origin === ORIGIN && result.length <= 200 ? result : undefined;
      }
      path = decoded;
    }
  } catch { /* Malformed escapes never become a redirect. */ }
  return undefined;
}
export function mergeCampaignDestination(destination: string, incoming: string, utm: Record<string, string>): string {
  const url = new URL(normalizeCampaignDestination(destination) || '/', ORIGIN);
  const merged = new URLSearchParams();
  url.searchParams.forEach((value, key) => { if (!merged.has(key)) merged.set(key, value); });
  const seen = new Set<string>();
  new URLSearchParams(incoming).forEach((value, key) => {
    if (!seen.has(key)) { merged.set(key, value); seen.add(key); }
  });
  for (const [key, value] of Object.entries(utm)) if (!merged.has(key)) merged.set(key, value);
  url.search = merged.toString();
  return `${url.pathname}${url.search}${url.hash}`;
}
export function signCampaignClick(id: string, secret: string): string {
  return `${id}.${createHmac('sha256', secret).update(`campaign-cookie-v1:${id}`).digest('hex')}`;
}
export function readCampaignClickCookie(req: Pick<CampaignRequest, 'headers'>, secret = process.env.STOREFRONT_CONTEXT_SECRET, edgeSecret = process.env.CAMPAIGN_EDGE_SECRET): string | undefined {
  const header = req.headers.cookie;
  if (typeof header !== 'string' || header.length > 8192 || ((!secret || secret.length < 32) && (!edgeSecret || edgeSecret.length < 32))) return undefined;
  const matches = header.split(';').map(part => part.trim()).filter(part => part.split('=', 1)[0] === 'ml_cclick');
  if (matches.length !== 1) return undefined;
  const value = matches[0].slice('ml_cclick='.length);
  const [id, signature, extra] = value.split('.');
  if (extra !== undefined || !UUID.test(id) || !/^[a-f0-9]{64}$/.test(signature || '')) return undefined;
  const candidates = [secret, edgeSecret].filter((candidate): candidate is string => typeof candidate === 'string' && candidate.length >= 32);
  return candidates.some(candidate => timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(signCampaignClick(id, candidate).split('.')[1], 'hex'))) ? id : undefined;
}

export function signCampaignReceipt(value: Record<string, unknown>, secret = process.env.CAMPAIGN_EDGE_SECRET): string {
  if (!secret || secret.length < 32) throw new Error('Invalid campaign edge secret');
  const payload = Buffer.from(JSON.stringify(value)).toString('base64url');
  const signature = createHmac('sha256', secret).update(`campaign-receipt-v1:${payload}`).digest('hex');
  return `${payload}.${signature}`;
}

export function readCampaignReceipt(req: Pick<CampaignRequest, 'headers'>, secret = process.env.CAMPAIGN_EDGE_SECRET, contextSecret = process.env.STOREFRONT_CONTEXT_SECRET): string | undefined {
  const cookie = req.headers.cookie;
  if (typeof cookie !== 'string' || cookie.length > 8192 || !secret || secret.length < 32) return undefined;
  const matches = cookie.split(';').map(part => part.trim()).filter(part => part.split('=', 1)[0] === 'ml_cproof');
  if (matches.length !== 1) return undefined;
  const token = matches[0].slice('ml_cproof='.length);
  const [payload, signature, extra] = token.split('.');
  if (extra !== undefined || !payload || !/^[a-f0-9]{64}$/.test(signature || '') || payload.length > 1800) return undefined;
  const expected = createHmac('sha256', secret).update(`campaign-receipt-v1:${payload}`).digest();
  if (!timingSafeEqual(Buffer.from(signature, 'hex'), expected)) return undefined;
  try {
    const event = JSON.parse(Buffer.from(payload, 'base64url').toString()) as Record<string, unknown>;
    const age = Date.now() - Date.parse(String(event.clickedAt || ''));
    if (event.v !== 1 || event.handle !== 'serakhabar' || typeof event.clickId !== 'string' || !UUID.test(event.clickId)
      || typeof event.linkId !== 'string' || !UUID.test(event.linkId) || event.isBot !== false
      || !Number.isFinite(age) || age < -60_000 || age > 30 * 86400000
      || readCampaignClickCookie(req, contextSecret, secret) !== event.clickId) return undefined;
    return token;
  } catch { return undefined; }
}

export async function resolveCampaignRedirect(req: CampaignRequest, value: unknown, options: CampaignRedirectOptions = {}): Promise<{ location: string; cookie?: string }> {
  const slug = normalizeCampaignSlug(value);
  const incoming = new URL(req.url || '/', ORIGIN).search;
  const fallback = { location: mergeCampaignDestination('/', incoming, slug ? { utm_campaign: slug } : {}) };
  if (!slug) return fallback;
  const suite = (options.merchantSuiteUrl ?? (process.env.NODE_ENV === 'production' ? 'https://sera-khabar-commerceos.vercel.app' : process.env.MERCHANT_SUITE_URL) ?? '').replace(/\/$/, '');
  const handle = options.storefrontHandle ?? process.env.STOREFRONT_HANDLE;
  const secret = options.secret ?? process.env.STOREFRONT_CONTEXT_SECRET;
  const local = options.local ?? process.env.NODE_ENV !== 'production';
  if (!suite || !handle) return fallback;
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    // The platform header is trusted on Vercel. Local Express trusts only its
    // socket, not visitor-supplied x-forwarded-for/x-real-ip headers.
    const contextReq = { ...req, headers: { 'user-agent': req.headers['user-agent'],
      ...(!local ? { 'x-vercel-forwarded-for': req.headers['x-vercel-forwarded-for'] } : {}) } };
    const signed = createSignedClientContext(contextReq, { deviceId: null }, secret);
    const requestId = randomUUID();
    let referrer: string | undefined;
    try {
      const source = req.headers.referer;
      if (typeof source === 'string' && source.length <= 2048) {
        const url = new URL(source);
        if (/^https?:$/.test(url.protocol) && url.hostname.length <= 253) referrer = `${url.protocol}//${url.hostname}/`;
      }
    } catch { /* Referrer is only an untrusted bounded hint. */ }
    const lookup = async () => {
      const response = await (options.fetchImpl ?? fetch)(`${suite}/api/public/v1/${encodeURIComponent(handle)}/campaign-links/${slug}/clicks`, {
        method: req.method === 'HEAD' ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json',
          'x-mlbd-campaign-request-id': requestId, ...(signed ? { [CLIENT_CONTEXT_HEADER]: signed } : {}) },
        ...(req.method === 'HEAD' ? {} : { body: JSON.stringify({ referrer }) }), signal: controller.signal,
      });
      if (!response.ok) return fallback;
      const data = await response.json() as Record<string, unknown>;
      const destination = normalizeCampaignDestination(data.destinationPath);
      if (!destination || !data.utm || typeof data.utm !== 'object' || Array.isArray(data.utm)) return fallback;
      const defaults: Record<string, string> = {};
      for (const key of ['utm_source', 'utm_medium', 'utm_campaign']) {
        const value = (data.utm as Record<string, unknown>)[key];
        if (typeof value === 'string' && value.length <= 120) defaults[key] = value;
      }
      const location = mergeCampaignDestination(destination, incoming, defaults);
      const ua = String(req.headers['user-agent'] || '').slice(0, 400);
      const bot = /facebookexternalhit|facebot|meta-externalagent|meta-externalfetcher|skypeuripreview|bot\b|crawler|spider|headlesschrome|^curl\/|^wget\/|python-requests/i.test(ua) || /^WhatsApp(?:\/|\s|$)/i.test(ua.trim());
      const click = typeof data.clickId === 'string' && UUID.test(data.clickId) ? data.clickId : undefined;
      const cookie = click && signed && secret && !bot && req.method !== 'HEAD'
        ? `ml_cclick=${signCampaignClick(click, secret)}; Path=/; Max-Age=2592000; HttpOnly;${local ? '' : ' Secure;'} SameSite=Lax` : undefined;
      return { location, ...(cookie ? { cookie } : {}) };
    };
    return await Promise.race([lookup(), new Promise<typeof fallback>(resolve => {
      timer = setTimeout(() => { controller.abort(); resolve(fallback); }, 2000);
    })]);
  } catch { return fallback; }
  finally { clearTimeout(timer); controller.abort(); }
}
