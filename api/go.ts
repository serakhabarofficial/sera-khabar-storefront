import type { IncomingMessage, ServerResponse } from 'node:http';
import { resolveCampaignRedirect, type CampaignRedirectOptions } from '../server/campaign-links.js';

export function createGoHandler(options: CampaignRedirectOptions = {}) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.setHeader('Allow', 'GET, HEAD'); res.statusCode = 405; res.end(); return;
    }
    const url = new URL(req.url || '/', 'https://www.serakhabar.com');
    const local = options.local ?? process.env.NODE_ENV !== 'production';
    if (!local && req.headers.host === 'serakhabar.com') {
      res.statusCode = 302; res.setHeader('Location', `https://www.serakhabar.com${url.pathname}${url.search}`); res.end(); return;
    }
    let slug: string | undefined;
    if (url.pathname.startsWith('/go/')) {
      try { slug = decodeURIComponent(url.pathname.slice(4)); } catch { /* Invalid path falls back. */ }
    } else {
      // Vercel rewrite supplies this private routing parameter. Do not carry it
      // into the storefront destination; ordinary incoming keys are preserved.
      const privateSlug = url.searchParams.get('__campaign_slug');
      slug = privateSlug ?? undefined;
      if (privateSlug !== null) {
        // Vercel's rewrite also appends `slug`. Remove only one matching value;
        // preserve other duplicate caller values and unrelated query keys.
        const clean = new URLSearchParams();
        let removedRewriteSlug = false;
        url.searchParams.forEach((value, key) => {
          if (key === '__campaign_slug') return;
          if (!removedRewriteSlug && key === 'slug' && value === privateSlug) { removedRewriteSlug = true; return; }
          clean.append(key, value);
        });
        url.search = clean.toString();
      }
    }
    const result = await resolveCampaignRedirect({ headers: req.headers, socket: req.socket, method: req.method, url: `${url.pathname}${url.search}` }, slug, options);
    if (result.cookie) {
      const existing = res.getHeader('Set-Cookie');
      res.setHeader('Set-Cookie', [...(Array.isArray(existing) ? existing.map(String) : existing ? [String(existing)] : []), result.cookie]);
    }
    res.statusCode = 302; res.setHeader('Location', result.location); res.end();
  };
}
export default createGoHandler();
