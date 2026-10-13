# Footer — grey shadow (2026-10-13)

Mockup for the request "grey colour shadow in the footer". Open
`footer-grey-shadow-variants.html` in a browser; no build step, no server needed.

## What is being mocked up

The cash memo footer that ships on the poster homepage and product pages:

- markup: `client/src/components/layout.tsx:408` (`<footer className="sk">`)
- styles: `client/src/poster.css:209-246`
- current shadow: `client/src/poster.css:216` — `.sk .memo-w` uses
  `filter: drop-shadow(0 0.5px 0.5px rgba(58,29,15,.2)) drop-shadow(0 6px 8px rgba(58,29,15,.08))`

The mockup renders that footer verbatim (same palette, same torn `clip-path` bottom
edge, same tack pin, same memo rows) with only the shadow rules swapped, inside a
strip of the real homepage above it so the seam is visible.

## Variants

| Variant | What changes | Where |
| --- | --- | --- |
| 0 · Today | Nothing. Warm brown, two layers. | — |
| A · Grey paper | Brown → neutral grey, same two layers | `poster.css:216` |
| B · Grey + halo | Three grey layers: contact, near, ambient | `poster.css:216` |
| C · Grey seam | Soft grey band on the footer's top edge, paper shadow also grey | footer block rule in `poster.css` |
| D · Lifted footer | Rounded sheet + grey shadow around the whole footer block | footer block rule in `poster.css` |

Recommendation: **B**. It is the only one that reads as light — a tight contact
edge, a near layer, and a wide 7% ambient — while keeping the footer quiet.

## Implementation traps

- Keep `filter: drop-shadow()` on `.sk .memo-w`. A `box-shadow` draws a
  rectangle and destroys the torn bottom edge of the memo.
- Do not lift the paper twice. In variant D the memo shadow is pulled back so the
  memo does not float inside a floating sheet.
- Shadow spread should shrink on phones (variant B includes a
  `@container site (max-width: 719px)` override). A 26px ambient on a 390px
  screen reads as dirt, not as air.

## Applying a variant

Change is CSS-only and lives in the storefront repo:

- A / B: edit `client/src/poster.css` line 216.
- C / D: add a `footer.sk` rule near line 208 in `client/src/poster.css`.

No storefront rebuild considerations beyond the normal Vercel redeploy; this is
static CSS, not a runtime data path.