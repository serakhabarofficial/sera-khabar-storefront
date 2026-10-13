# Numerals — font candidates (2026-10-13)

Mockup for replacing Atma as the storefront's numeral face. Open
`numeral-font-candidates.html` in a browser; no build step, no server.

## What is being mocked up

Atma currently sets **every digit in the storefront**. It is wired in at
`client/src/poster.css` in ~20 rules, and reached indirectly through
`client/src/lib/bangla-digits.tsx`, whose `.num` spans are styled by the
`.sk .num` / `.skp .num` rules.

The important detail: `toBanglaDigits()` converts every number to **Bengali
numerals** (০১২৩৪৫৬৭৮৯), so the face has to cover U+09E6–U+09EF. The taka sign
৳ (U+09F3) sits in the same block.

Real contexts rendered in the mockup, all copied from live source:

| Surface | Source |
| --- | --- |
| Numbered category rings `০১ ০২ ০৩` | `client/src/pages/home.tsx:85` |
| Signboard price `৳৯৮৫০০` | `client/src/pages/home.tsx:190` |
| Inline digits in Bangla copy `৫০০ গ্রাম থেকে শুরু` | `client/src/pages/home.tsx:191` |
| Product card price + variant weight | `client/src/components/poster-product-card.tsx` |
| Cart rows, qty pill, subtotal | `client/src/components/cart-drawer.tsx` |
| Memo `নং ৫১`, `তারিখ: ০২ মার্চ`, `২০২৬`, postcode `৬২১৩` | `client/src/components/layout.tsx:420,465` |

Every variant sets `font-variant-numeric: tabular-nums` so prices align in a
column — the current Atma setting does not guarantee that.

## Candidates

| Variant | Family | Axis | Note |
| --- | --- | --- | --- |
| 0 | Atma | 700 only | Baseline |
| A | Geist + Noto Serif Bengali | Geist is variable | Geist has **no** Bengali subset |
| B | Noto Sans Bengali | variable 100–900 | One voice for both scripts |
| C | Hind Siliguri | static 300–700 | Crispest small |
| D | Anek Bangla | variable + width | Narrowest, coldest |
| E | Baloo Da 2 | variable 400–800 | Softest, warmest |
| F | Geist + Noto Sans Bengali | Geist variable | Latin digits match English |

All six exist on Google Fonts and were confirmed reachable. Availability is not
a constraint here; the choice is about voice.

## The constraint worth knowing

**Geist cannot carry Bangla digits.** It ships no Bengali subset, so any stack
starting with Geist silently falls through for ০–৯. Variant A does that on
purpose and the serif fallback is visible in the mockup; variant F pairs Geist
with a *sans* Bangla fallback so the seam is quiet.

Atma's real limitation is that it has **one weight (700)**. Everything is pinned
there today, so there is no axis to tune small digits lighter or the signboard
heavier.

## Applying a choice

CSS + one font-link edit, both in the storefront repo:

1. Add the family to the link in `client/index.html`.
2. Replace the `"Atma", sans-serif` stacks in `client/src/poster.css`.

`client/src/lib/bangla-digits.tsx` needs no logic change. Its helper
`withAtmaDigits` would want renaming, since the name would no longer match the
face. `client/src/pages/home.test.ts` asserts
`.sk .num { font-family: "Atma"` and would need updating too.