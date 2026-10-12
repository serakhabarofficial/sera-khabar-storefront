# Sera Khabar Storefront — Setup Handoff

> **For the AI agent:** this repo is a **copy of the Mango Lover BD storefront**
> being set up for a new, separate merchant: **Sera Khabar**. The full step-by-step
> plan covering both repos is in
> `~/merchant-b/sera-khabar-commerceos/SERA_KHABAR_SETUP.md`. Read that first,
> including its safety rules. This file lists only the storefront-specific work.
> It overrides any Mango Lover text in `CLAUDE.md` / `README.md`.

Written 2026-10-12. Pushed to `serakhabarofficial/sera-khabar-storefront` from
Mango Lover commit `5c06ac6` with `--no-verify` (the build needs
`VITE_MERCHANT_SUITE_URL`, which doesn't exist yet). Nothing has been rebranded yet.

## Safety

- Never touch `mangoloverbd/mangoloverbd_storefront` or the Mango Lover folder.
- Before pushing: `gh auth status` must show active `serakhabarofficial`, and
  `git remote -v` must show only `serakhabarofficial/sera-khabar-storefront`.
- The MCP configs (`.mcp.json`, `.codex/config.toml`) are set to the placeholder
  `SERA_KHABAR_SUPABASE_REF`. Replace it with Sera Khabar's Supabase ref once that
  project exists. Never point them at `ldiktvcavyabivpxfwpn` (Mango Lover).

## Prerequisites (from the Suite handoff)

You need these first: the Sera Khabar Suite URL, the storefront handle, the new
workspace id (`select org_id from user_roles;` in Sera Khabar's Supabase), the
Sera Khabar Supabase ref, the domain, the brand name and logo, and GTM/GA4 IDs (or none).

## Mango Lover values hardcoded here (found 2026-10-12)

**Critical: without these changes the storefront shows Mango Lover's products and sends orders/analytics to Mango Lover.**

| File | Mango Lover value | Replace with |
|---|---|---|
| `script/build.ts:12` | default storefront id `2a155750-b11a-4ff2-a7ff-4e26daac46ef` | Sera Khabar workspace id (or read from env only) |
| `script/build.ts:15` | production Suite URL `https://admin.mangolover.com.bd` | Sera Khabar Suite URL |
| `middleware.ts:14-15` | `merchantSuiteUrl: 'https://admin.mangolover.com.bd'`, `storefrontHandle: 'mangoloverbd'` | Sera Khabar values |
| `server/order-service.ts:89` | `https://admin.mangolover.com.bd` | Sera Khabar Suite URL |
| `server/abandoned-cart-service.ts:149` | `https://admin.mangolover.com.bd` | Sera Khabar Suite URL |
| `server/campaign-links.ts:5, 86, 99` | `https://www.mangolover.com.bd`, handle `'mangoloverbd'`, admin URL | Sera Khabar values |
| `server/campaign-edge.ts:4` | `https://www.mangolover.com.bd` | Sera Khabar storefront URL |
| `server/campaign-middleware.ts:104` | apex hostname `mangolover.com.bd` | Sera Khabar apex domain |
| `vercel.json:152` | image host `ldiktvcavyabivpxfwpn.supabase.co` | `<new-ref>.supabase.co` |
| `client/index.html` | GTM `GTM-5KKTRHFD`, title/OG tags "ম্যাংগো লাভার - Mango Lover", `www.mangolover.com.bd` | Sera Khabar GTM (or remove), brand, domain |
| `client/src/App.tsx:28-36`, `client/src/components/layout.tsx` (~532, 672, 718), `api/legacy-gone.ts:9` | Bangla brand name ম্যাংগো লাভার | Sera Khabar brand |
| `client/src/lib/generated-storefront-products.ts` | **generated snapshot of Mango Lover's products** | regenerate from Sera Khabar's Suite at build time, or empty it |
| `client/src/features/*` (e.g. `kalojira-mixed/bori-content.ts`) and curated product/landing content | Mango Lover-specific products, images, pages | remove or replace with Sera Khabar content |
| `.env.example` | Mango Lover workspace id `3cd26e57-…` | Sera Khabar values |
| `public/` / `client/public/` | logos, favicon, OG images | Sera Khabar branding |
| `CLAUDE.md`, `README.md` | Mango Lover docs, Vercel project `mangoloverbd`, Supabase ref | Sera Khabar |
| `*.test.ts` (campaign-links, campaign-middleware, order-service, analytics-session, vite-plugin-merchant-suite-tracker) | `mangoloverbd`, `mangolover.com.bd` | update so tests pass |

Final sweep, where only historical `docs/` may still match:

```bash
grep -rniE "mangolover|mango lover|ম্যাংগো|ldiktvcavyabivpxfwpn|3cd26e57|2a155750|GTM-5KKTRHFD|G-Q7J7KV6ZVC" . --exclude-dir={node_modules,dist,.git,docs}
```

Check the design too (colors, copy, hero images); ask the user how Sera Khabar should look.

## Env vars used by this storefront

`VITE_MERCHANT_SUITE_URL`, `MERCHANT_SUITE_URL`, `VITE_STOREFRONT_ID`,
`STOREFRONT_HANDLE`, `CUSTOM_ORDERS_API_KEY` (server-only, never `VITE_`),
`STOREFRONT_CONTEXT_SECRET`, `CAMPAIGN_EDGE_SECRET`, `CRON_SECRET` (these three must
match the Sera Khabar Suite), `VITE_TURNSTILE_SITE_KEY` (optional), `DATABASE_URL` (check whether it's still used).

## Done when

- [ ] `npm run build` passes with Sera Khabar env vars; the hook passes on push (no `--no-verify`)
- [ ] Deployed via the Suite's **Provision Storefront**, on the new Vercel account
- [ ] Shows only Sera Khabar products; a test order lands in the Sera Khabar Suite
- [ ] `www` domain is DNS-only (grey cloud) in the new Cloudflare account
