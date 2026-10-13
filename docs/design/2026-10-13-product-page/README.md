# Product page redesign — approved direction (2026-10-13)

Implemented in `client/src/pages/product.tsx` with styles under `.skp` in `client/src/poster.css`.
Mockup rounds are kept in this folder: `product-page-variants-round1-2.html` (poster/memo ideas),
`-round3.html` (reference-led Classic/Panels/Sections), `-round4.html` (details options) and
`product-page-variants.html` (delivery-estimate options, round 5).

**Layout — "Classic"** (from the owner's references): photo left / info right on desktop; on phones
photo → info → details.
- Photo: the catalog photo at its own size, rounded 28px, with its own background — no cream panel,
  blend or mask (owner, 2026-10-13). Category chip (rose) and a round "ক্যাশ অন ডেলিভারি" seal on top.
- Info: Noto Serif Bengali title, small blush pill (English name · sizes), Galada "রাজশাহী থেকে",
  description, up to three ✓ highlights from the first details list, Atma price (total for the chosen
  quantity), size cards with real per-kg prices and a pink saving badge only when the numbers give one
  (`lib/product-sizes.ts`), quantity + turmeric "অর্ডার করুন" (opens the order sheet), "কার্টে রাখুন",
  then "অথবা" with ফোনে অর্ডার (tamarind) and হোয়াটসঅ্যাপে অর্ডার (green).
- Delivery estimate below those buttons: a tear-off calendar page (tomorrow → three days out) with
  "আজ অর্ডার করলে আপনার দরজায় পৌঁছাবে" and "ঢাকায় ১–২ দিন · ঢাকার বাইরে ২–৩ দিন".
- Details: "বিস্তারিত / জেনে নিন", homepage shelf chips switching one card styled exactly like the
  footer cash memo (tack, ruled paper, torn edge, logo header, নং, dotted rows; COD stamp on the
  delivery page). Everything in the details uses the title font. The last page restates the delivery
  and payment policy.
- Then a turmeric trust strip, the existing reels (when a product has them), "আরও দেখুন" with the
  homepage poster cards, and "সম্প্রতি দেখা" (also restyled; shared with the products page).
- Removed at the owner's request: "পণ্য হাতে পেয়ে, দেখে তারপর টাকা দিন"; no star ratings or reviews
  (none exist yet).
