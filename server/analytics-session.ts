import type { IncomingHttpHeaders } from 'node:http';

// The Merchant-Suite tracker keeps the current website visit in the first-party
// `ms_sid` cookie. Order proxies forward it so the Suite can link the order to
// the visit (and its ad/source). It is only a hint: the Suite links it only when
// that visit exists for this store and was live at submission.
export const ANALYTICS_SESSION_HEADER = 'x-mlbd-analytics-session-id';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function readAnalyticsSessionCookie(req: { headers: IncomingHttpHeaders }): string | undefined {
  const header = req.headers.cookie;
  if (typeof header !== 'string' || header.length > 8192) return undefined;
  const matches = header.split(';').map(part => part.trim()).filter(part => part.split('=', 1)[0] === 'ms_sid');
  if (matches.length !== 1) return undefined;
  const value = matches[0].slice('ms_sid='.length);
  return UUID.test(value) ? value.toLowerCase() : undefined;
}

// The same tracker keeps a random per-browser id in the first-party `ms_vid`
// cookie. The checkout proxy forwards it so the Suite can recognise a returning
// buyer; the Suite never sends that buyer's details back to the browser.
export const ANALYTICS_VISITOR_HEADER = 'x-mlbd-analytics-visitor-id';

export function readAnalyticsVisitorCookie(req: { headers: IncomingHttpHeaders }): string | undefined {
  const header = req.headers.cookie;
  if (typeof header !== 'string' || header.length > 8192) return undefined;
  const matches = header.split(';').map(part => part.trim()).filter(part => part.split('=', 1)[0] === 'ms_vid');
  if (matches.length !== 1) return undefined;
  const value = matches[0].slice('ms_vid='.length);
  return UUID.test(value) ? value.toLowerCase() : undefined;
}
