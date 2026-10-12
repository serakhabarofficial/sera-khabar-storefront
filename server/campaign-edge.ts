// Web Crypto only, so it runs in any runtime Vercel Routing Middleware uses
// (Node.js or edge). Signatures must stay byte-for-byte
// compatible with server/campaign-links.ts and Merchant Suite's campaignEvents.js.
const ORIGIN = 'https://www.serakhabar.com';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type CampaignRoute = { linkId: string; destinationPath: string; utm: Record<string, string> };
export type CampaignDevice = 'mobile' | 'desktop' | 'tablet' | 'unknown';
export type CampaignEvent = {
  v: 1; handle: string; linkId: string; clickId: string; clickedAt: string; isBot: boolean;
  visitorHash: string | null; referrerHost: string | null; device: CampaignDevice;
};

function b64url(bytes: Uint8Array) {
  let binary = '';
  for (let index = 0; index < bytes.length; index++) binary += String.fromCharCode(bytes[index]);
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}
function hex(bytes: Uint8Array) { return Array.from(bytes).map(byte => byte.toString(16).padStart(2, '0')).join(''); }
async function hmac(text: string, secret: string) {
  if (secret.length < 32) throw new Error('CAMPAIGN_EDGE_SECRET must be at least 32 characters');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text)));
}
function validDestination(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length > 200 || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(value)) return;
  try {
    if (/[\\\u0000-\u001f\u007f]/.test(decodeURIComponent(value))) return;
    let path = value.split(/[?#]/, 1)[0];
    for (let depth = 0; depth < 8; depth++) {
      if (!path.startsWith('/') || path.startsWith('//') || /%2f|%3f|%23/i.test(path)) return;
      const url = new URL(path, ORIGIN);
      if (url.origin !== ORIGIN || /^\/go(?:\/|$)/i.test(url.pathname)) return;
      const decoded = /%[0-9a-f]{2}/i.test(path) ? decodeURIComponent(path) : path;
      if (decoded === path) {
        const final = new URL(value, ORIGIN);
        const result = `${final.pathname}${final.search}${final.hash}`;
        return final.origin === ORIGIN && result.length <= 200 ? result : undefined;
      }
      path = decoded;
    }
  } catch { /* Invalid escapes fail closed. */ }
}

export function normalizeSlug(value: string) {
  const slug = value.trim().toLowerCase();
  return slug.length >= 3 && slug.length <= 60 && SLUG.test(slug) ? slug : undefined;
}
export function isBot(value: string) {
  const ua = value.slice(0, 400);
  return /facebookexternalhit|facebot|meta-externalagent|meta-externalfetcher|skypeuripreview|bot\b|crawler|spider|headlesschrome|^curl\/|^wget\/|python-requests/i.test(ua)
    || /^WhatsApp(?:\/|\s|$)/i.test(ua.trim());
}
export function deviceFor(userAgent: string): CampaignDevice {
  return /iPad|Tablet/i.test(userAgent) ? 'tablet' : /Mobile|Android|iPhone/i.test(userAgent) ? 'mobile' : userAgent ? 'desktop' : 'unknown';
}
export function mergeDestination(destination: string, incoming: string, utm: Record<string, string>) {
  const safe = validDestination(destination) ?? '/';
  const url = new URL(safe, ORIGIN);
  const merged = new URLSearchParams();
  url.searchParams.forEach((value, key) => { if (!merged.has(key)) merged.set(key, value); });
  const seen = new Set<string>();
  new URLSearchParams(incoming).forEach((value, key) => { if (!seen.has(key)) { merged.set(key, value); seen.add(key); } });
  for (const [key, value] of Object.entries(utm)) if (!merged.has(key)) merged.set(key, value);
  url.search = merged.toString();
  return `${url.pathname}${url.search}${url.hash}`;
}
export async function signReceipt(event: CampaignEvent, secret: string) {
  const payload = b64url(new TextEncoder().encode(JSON.stringify(event)));
  return `${payload}.${hex(await hmac(`campaign-receipt-v1:${payload}`, secret))}`;
}
export async function signCookie(id: string, secret: string) {
  return `${id}.${hex(await hmac(`campaign-cookie-v1:${id}`, secret))}`;
}
export async function verifyPurgeSignature(timestamp: string, body: string, signature: string, secret: string, now = Date.now()) {
  if (!/^\d{13}$/.test(timestamp) || !/^[a-f0-9]{64}$/.test(signature) || Math.abs(now - Number(timestamp)) > 60_000 || body.length > 2048) return false;
  const actual = await hmac(`campaign-purge-v1:${timestamp}:${body}`, secret);
  const supplied = Uint8Array.from(signature.match(/.{2}/g) ?? [], part => Number.parseInt(part, 16));
  if (actual.length !== supplied.length) return false;
  let difference = 0;
  for (let index = 0; index < actual.length; index++) difference |= actual[index] ^ supplied[index];
  return difference === 0;
}
// Same daily visitor key as Merchant Suite's buildCampaignVisitorHash.
export async function visitorHash(secret: string, day: string, ip: string, userAgent: string) {
  return hex(await hmac(JSON.stringify(['mlbd:campaign-visitor-day:v1', day, ip, userAgent.slice(0, 400)]), secret));
}
export function validateRoute(value: unknown): CampaignRoute | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const data = value as Record<string, unknown>;
  const destinationPath = validDestination(data.destinationPath);
  const utm = data.utm;
  if (!UUID.test(String(data.linkId || '')) || !destinationPath || !utm || typeof utm !== 'object' || Array.isArray(utm)) return undefined;
  const safeUtm: Record<string, string> = {};
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign']) {
    const item = (utm as Record<string, unknown>)[key];
    if (typeof item === 'string' && item.length <= 120) safeUtm[key] = item;
  }
  return { linkId: String(data.linkId), destinationPath, utm: safeUtm };
}
