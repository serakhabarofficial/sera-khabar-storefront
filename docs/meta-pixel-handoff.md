# Meta Pixel + Conversions API — Handoff

Read this before building a landing page, a checkout, or anything that touches tracking.
Approved 2026-10-20. Pixel ID **1433713624268170**.

## The one rule

**Never call Meta directly. Call `trackGoogleEcommerceEvent()` from `@/lib/google-analytics`.**

That one helper:
1. pushes the ecommerce event to `window.dataLayer` (the merchant's GTM-style format), and
2. mirrors it to Meta — browser Pixel **and** Conversions API — with one shared `event_id`.

So a new page that sends the normal ecommerce events is fully set up for Meta with no extra code.
PageView is automatic for every route. `client/src/lib/meta-coverage.test.ts` fails the build of
tests if a landing skips an event or calls `fbq` itself.

## How it works

```
Page ─ trackGoogleEcommerceEvent("add_to_cart", …)
        ├─ window.dataLayer.push({ event, ecommerce, event_id, fbp, fbc })
        ├─ fbq("track", "AddToCart", data, { eventID })                ──► Meta (browser)
        └─ sendBeacon /api/storefront-signal { event_name, event_id, … }
              api/storefront-signal.ts: 204 at once, then in waitUntil:
              + IP, user agent, _fbp, _fbc, hashed device id           ──► Meta CAPI (server)

Checkout ─ POST /api/orders ─ Suite accepts order (orderRef)
              api/orders.ts: Purchase, event_id "purchase-<orderRef>",
              hashed phone + name, value, items, shipping               ──► Meta CAPI (server)
Thank-you ─ trackGoogleEcommerceEvent("purchase", { transactionId: orderRef, … })
              fbq Purchase with eventID "purchase-<orderRef>"           ──► Meta (browser)
```

Meta keeps one copy of each event because both copies carry the same `event_name` + `event_id`.

| dataLayer event | Meta event | Browser Pixel | Server (CAPI) |
|---|---|---|---|
| (route change) | `PageView` | yes | yes, via `/api/storefront-signal` |
| `view_item` | `ViewContent` | yes | yes, via `/api/storefront-signal` |
| `add_to_cart` | `AddToCart` | yes | yes, via `/api/storefront-signal` |
| `begin_checkout` | `InitiateCheckout` | yes | yes, via `/api/storefront-signal` |
| `purchase` | `Purchase` | yes | yes, from `api/orders.ts` after the order is saved |
| `select_item` | — (not a Meta event) | no | no |

No `AddPaymentInfo`: checkout is cash on delivery only. No email: checkout does not ask for one.

## Files

| File | Role |
|---|---|
| `shared/meta.ts` | Pixel ID, signal path, allowed browser events, `metaPurchaseEventId()` |
| `client/index.html` | Loads `fbevents.js`, `fbq.disablePushState = true`, `fbq('init')`. No `track` here. Skipped on localhost. |
| `client/src/lib/meta-pixel.ts` | The only file that calls `fbq`. Maps dataLayer events, builds `custom_data`, sends the beacon |
| `client/src/lib/google-analytics.ts` | `trackGoogleEcommerceEvent()` — the helper every page calls |
| `client/src/App.tsx` | `trackMetaPageView()` once per route |
| `api/storefront-signal.ts` | Vercel function: validates browser events and forwards to CAPI |
| `server/meta-capi.ts` | Hashing, user data, validation, Purchase builder, Graph API send (v23.0, 1 retry) |
| `api/orders.ts` + `server/routes.ts` | Server Purchase after an accepted order (keep both in sync) |
| `client/src/lib/meta-coverage.test.ts` | Guard: every landing checkout / thank-you page is tracked, nobody calls `fbq` |

## Environment (storefront Vercel project only)

| Variable | Secret | Purpose |
|---|---|---|
| `META_CAPI_TOKEN` | **yes** | Conversions API token. Without it the server half is skipped silently. |
| `META_TEST_EVENT_CODE` | no | Events Manager → Test Events code. Set while testing, delete after. |

Never give either a `VITE_` prefix. The Pixel ID is public and lives in code, not env.

## Checklist: a new landing page

Landing pages live at `/step/<name>` (see the existing `honey-nut`, `kalojira-mixed`,
`sundarbans-honey`, `katimon-mango`, `homemade-pumpkin-bori`).

1. **Route** — register `/step/<name>` (and `/step/<name>/thank-you`) in `client/src/App.tsx` inside
   the existing `<Switch>`. PageView is then automatic. Nothing else to add for PageView.
2. **Names** — the checkout component must be `client/src/features/<name>/<something>-checkout.tsx` and
   the thank-you page `client/src/pages/<name>-thank-you.tsx`. The guard test finds them by these names.
   If you reuse an existing checkout (as `katimon-mango` and `homemade-pumpkin-bori` reuse
   `KalojiraCheckout`), it is already tracked.
3. **ViewContent** — when the product is shown:
   `trackGoogleEcommerceEvent("view_item", { pageType: "product", value, items })`.
4. **InitiateCheckout** — when the customer starts the order form:
   `trackGoogleEcommerceEvent("begin_checkout", { pageType: "checkout", value, items })`.
5. **AddToCart** — only if the page has a cart button; the shared cart context already sends it.
6. **Items** — build them with `toGoogleAnalyticsItem({ id, name, category, variant, price, quantity })`.
   Use the **product id** from the catalog as `id` (not the product name), so browser and server
   `content_ids` match and catalog ads work.
7. **Order** — POST through `/api/orders` (never straight to the Suite). That is what sends the server
   Purchase. Send `items` with the real `productId`s.
8. **Purchase** — on the thank-you page, once per order (use a sessionStorage marker like
   `features/honey-nut/tracking.ts`):
   ```ts
   trackGoogleEcommerceEvent("purchase", {
     pageType: "thank_you",
     transactionId: confirmation.orderRef,   // must be the Suite's orderRef: it is the dedup key
     value: confirmation.total,              // product total + delivery
     shipping: confirmation.deliveryCharge,
     affiliation: "", tax: 0, coupon: "",
     customer: { name: confirmation.customerName, phone: confirmation.phone, address: confirmation.address },
     items: [toGoogleAnalyticsItem({ … })],
   });
   ```
   Never fire Purchase for a `decision: "review"` (held) order — there is no `orderRef`.
9. **Verify** — `npx tsx --test client/src/lib/meta-coverage.test.ts client/src/lib/meta-pixel.test.ts`,
   `npm run check`, then the live check below.

## Live check (after deploy)

1. Set `META_TEST_EVENT_CODE` in Vercel and redeploy.
2. Events Manager → Test Events → open the site, view a product, add to cart, start checkout, place an
   order (say so first, then cancel it in the dashboard — CLAUDE.md rule 11).
3. Each event should appear from **Browser** and **Server**, marked **Deduplicated**, counted once.
   Purchase should show the right value, items and order id.
4. Remove `META_TEST_EVENT_CODE` and redeploy.
5. Keep **Automatic advanced matching** ON in Events Manager → Settings.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Only Browser events | `META_CAPI_TOKEN` missing or wrong; check Vercel function logs for `[Meta CAPI]` |
| Only Server events | Ad blocker (expected sometimes), or `fbevents.js` blocked; check the page loads it |
| Events counted twice | `event_id` differs: Purchase `transactionId` is not the Suite `orderRef`, or a page calls `fbq` itself |
| PageView twice per route | Someone removed `fbq.disablePushState = true` or added `fbq('track','PageView')` to index.html |
| `/api/storefront-signal` 400 | Event not in the allowlist, bad `event_id`, or page URL host ≠ request host |
| Nothing on localhost | Expected: the Pixel is off on localhost, and CAPI is off without a token |

## Don'ts

- Don't call `fbq`, `connect.facebook.net` or `graph.facebook.com` anywhere except `meta-pixel.ts` /
  `server/meta-capi.ts`.
- Don't send Purchase from the browser to `/api/storefront-signal`; it is rejected by design.
- Don't put plain name/phone/address into Meta `custom_data`. Customer data goes to Meta only hashed,
  in `user_data`, from the server.
- Don't add GTM to forward the same events to Meta as well; that doubles every event.
