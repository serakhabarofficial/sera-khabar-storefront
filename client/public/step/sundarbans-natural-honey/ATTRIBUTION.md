# Sundarbans Natural Honey — campaign media attribution

No authentic campaign media has been supplied yet. Nothing in this folder is
generated or fabricated as proof: sections that require missing originals ship
as honest text-first layout, and the review section is omitted entirely until
genuine reviews with display permission arrive.

The bottle image on the page is the live Supabase product image served through
the Merchant Suite catalog API. It is not duplicated in `client/public`.

## Required assets and status

| Versioned filename | Subject | Status |
|---|---|---|
| `sundarbans-river-hero-v1.webp` | Sundarbans river/forest hero original, at least 2400px wide | pending — no original supplied |
| `sundarbans-river-hero-mobile-v1.webp` | Mobile-only river illustration (AI-generated) | superseded 2026-09-07 — file deleted, replaced by honeycomb hero below |
| `sundarbans-honeycomb-hero-v1.webp` | Full-bleed hero art (honeycomb, hive, bees, honey stack illustration) | shipped — AI-generated file supplied by stakeholder 2026-09-07, used as decorative art; NOT an authentic photograph, never presented as proof of origin |
| `sundarbans-honey-hero-v2.webp` | Transparent honey product composition with bottle, box, honeycomb, flowers, and bees | shipped — AI-generated file supplied by stakeholder 2026-09-07, used as decorative hero art; NOT an authentic photograph or proof of origin, packaging, or credentials |
| `sundarbans-honey-hero-banner-v1.webp` | Wide premium honey banner supplied as a design graphic | shipped — supplied by stakeholder 2026-09-07, used as decorative hero art; the baked-in “lab tested” wording is not independently verified proof |
| `sundarbans-honey-headline-v1.webp` | Bangla hero headline artwork supplied as a wide design graphic | shipped — supplied by stakeholder 2026-09-07, used as decorative text artwork; not a product-origin, packaging, credential, or review claim |
| `sundarbans-honey-collection-heading-v1.webp` | Bangla collection-section heading artwork supplied as a wide design graphic | shipped — supplied by stakeholder 2026-09-07, used as decorative text artwork; not a collection-proof or origin claim |
| `sundarbans-why-special-heading-v1.webp` | Bangla "why special" section heading artwork supplied as a wide design graphic | shipped — supplied by stakeholder 2026-09-07, used as decorative text artwork replacing the heading copy; same wording kept as alt text and code fallback |
| `sundarbans-why-special-infographic-v2.webp` | "Why special" infographic (honey bottle + box render, bees, honeycomb, 5 Bangla points) | shipped — supplied design graphic by stakeholder 2026-09-07. Bottle/box are illustrative recreations, NOT real packaging photos. Baked-in Bangla copy mirrored in alt text plus a screen-reader-only list beside the image. |
| `sundarbans-why-special-infographic-v1.webp` | "Why special" infographic (hive, bees, 5 Bangla points, illustrative bottle + box render) | shipped — AI-generated file supplied by stakeholder 2026-09-07. Bottle/box are illustrative recreations, NOT real packaging photos; real bottle photo stays the live catalog image. Baked-in Bangla copy mirrored in a screen-reader-only list beside the image. |
| `sundarbans-honey-bundle-500g-v1.webp` | 500g honey bundle promotional graphic | superseded 2026-09-07 — file deleted, replaced by bundle-500g-v2 below |
| `sundarbans-honey-bundle-1kg-v1.webp` | 1kg honey bundle promotional graphic | superseded 2026-09-07 — file deleted, replaced by bundle-1kg-v2 below |
| `sundarbans-honey-bundle-500g-v2.webp` | 500g honey bundle promotional graphic (০.৫ কেজি, ৳800 badge) | superseded 2026-09-08 — file deleted, replaced by bundle-500g-v3 below |
| `sundarbans-honey-bundle-1kg-v2.webp` | 1kg honey bundle promotional graphic (১ কেজি, ৳1,600 badge) | superseded 2026-09-08 — file deleted, replaced by bundle-1kg-v3 below |
| `sundarbans-honey-bundle-500g-v3.webp` | 500g honey bundle card (white price card, ০.৫ কেজি ৳800) | shipped — supplied design graphic by stakeholder 2026-09-08; baked-in price is visual copy and checkout remains live |
| `sundarbans-honey-bundle-1kg-v3.webp` | 1kg honey bundle card (white price card, ১ কেজি ৳1,600) | shipped — supplied design graphic by stakeholder 2026-09-08; baked-in price is visual copy and checkout remains live |
| `sundarbans-hive-v1.webp` | Real natural hive photo | pending — no original supplied |
| `sundarbans-collection-v1.webp` | Real honey collection photo | pending — no original supplied |
| `sundarbans-collection-poster-v1.webp` | Poster frame for the collection video | pending — no original supplied |
| `sundarbans-collection-v1.mp4` | Real collection video, highest-quality original (H.264) | shipped 2026-09-08 — stakeholder supplied two real collection reels as Cloudinary embeds (see log); no local file, section placeholder removed |
| `sundarbans-collection-v1.webm` | Same collection video (VP9) | shipped 2026-09-08 — covered by the same two Cloudinary embeds; no local file |
| `nutritionist-murad-parvez-v1.webp` | Murad Parvez portrait | shipped — portrait supplied by stakeholder 2026-09-08, shown beside the approved statement and name; no credential list supplied, so none is claimed |
| `review-01-v1.webp` through `review-04-v1.webp` | Three or four genuine reviews plus display permission | pending — review section omitted until supplied; never commit private/unredacted review material |

## Processing log

- 2026-09-07 `sundarbans-why-special-infographic-v1.webp`: source `~/Downloads/ChatGPT Image Sep 7, 2026, 02_08_59 AM.webp` (1122×1402, 305 KB, AI-generated, Bangla copy baked in). Processed with `cwebp -q 86 -metadata none` → 1122×1402 kept, 179 KB, metadata stripped. Below-fold (`loading="lazy"`, explicit dimensions) with sr-only text mirror.

- 2026-09-07 `sundarbans-honeycomb-hero-v1.webp`: source `~/Downloads/ChatGPT Image Sep 7, 2026, 01_48_08 AM.webp` (1122×1402, 260 KB, AI-generated, no baked-in text). Processed with `cwebp -q 88 -metadata none` → 1122×1402 kept, 179 KB, metadata stripped. Full-bleed hero background on all breakpoints with cream bottom fade; decorative only.
- 2026-09-07 `sundarbans-honey-hero-v2.webp`: source `~/Downloads/ChatGPT Image Sep 7, 2026, 08_48_00 PM.webp` (1122×1402, 520 KB, AI-generated, transparent WebP). Processed with `cwebp -q 88 -metadata none` → 1122×1402, 375 KB, metadata stripped. Centered hero composition; decorative only and not a real product/packaging photograph.
- 2026-09-07 `sundarbans-honey-hero-banner-v1.webp`: source `~/Downloads/Untitled design (16).webp` (6400×2138, 394 KB, supplied design graphic). Resized to 2400×802 and processed with `cwebp -q 90 -metadata none` → 2400×802, 75 KB. Placed below the hero supporting sentence as decorative artwork; baked-in claims are not independently verified.
- 2026-09-07 `sundarbans-honey-headline-v1.webp`: source `~/Downloads/Untitled design (16).webp` (6400×2131, 525 KB, supplied design graphic). Resized to 2400×800 and processed with `cwebp -q 90 -metadata none` → 2400×800, 104 KB. Used as the hero heading artwork with accessible alt text.
- 2026-09-07 `sundarbans-honey-collection-heading-v1.webp`: source `~/Downloads/Picflow Images Sep 7/Untitled design (17).webp` (6400×2131, 415 KB, supplied design graphic). Resized to 2400×800 and processed with `cwebp -q 90 -metadata none` → 2400×800, 86 KB. Used as the collection-section heading artwork with accessible alt text.
- 2026-09-07 `sundarbans-why-special-heading-v1.webp`: source `~/Downloads/Untitled design (18).webp` (6400×2131, 454 KB, supplied design graphic). Resized to 2400×800 and processed with `cwebp -q 90 -metadata none` → 2400×800, 95 KB. Briefly removed then restored the same day per stakeholder request; used as the "why special" heading artwork replacing the heading copy, same wording kept as alt text and code fallback.
- 2026-09-07 `sundarbans-why-special-infographic-v2.webp`: source `~/Downloads/ChatGPT Image Sep 7, 2026, 08_35_29 PM.webp` (1254×1254, 428 KB, supplied design graphic, transparent WebP). Processed with `cwebp -q 86 -metadata none` → 1254×1254 kept, 300 KB, metadata stripped. Replaces the whole "why special" text section with the single infographic; baked-in Bangla copy mirrored in alt text plus an sr-only list. Bottle/box are illustrative recreations, NOT real packaging photos.
- 2026-09-08 `nutritionist-murad-parvez-v1.webp`: source `~/Downloads/WhatsApp Image 2026-08-29 at 01.08.40.jpeg` (1024×1536, 135 KB portrait photograph). Processed with `cwebp -q 86 -metadata none` → 1024×1536 kept, 97 KB, metadata stripped. Shown in a photo/quote card beside the approved statement and name (`loading="lazy"`, explicit dimensions). No credential list supplied — none claimed.
- 2026-09-08 collection reels (no local files): two stakeholder-supplied Cloudinary videos in the collection section — `AQPk2xiiGJkLlKAuYLArzgO3dROk08xjUPPg6ovJ7kQsv9zy8Wn5fw_jYTB_cp8D8j6y-V5xINML6aRGauN7ixv8sDLOE0K2cNygCbaHdIRQVg` and `snapsave-app_2560951824420061_hd` (cloud `n0d6bs08`). Rendered as native `<video controls playsInline preload="none">` via `res.cloudinary.com … /f_auto,q_auto/….mp4` so no third-party player branding appears. Click-to-play, Bangla titles, no autoplay. Placeholder slot removed.
- 2026-09-07 `sundarbans-river-hero-mobile-v1.webp`: source `~/Downloads/ChatGPT Image Sep 7, 2026, 01_18_47 AM.webp` (1122×1402, AI-generated, baked-in "Shundarban" lettering). Shipped briefly as mobile-only background, then superseded by the honeycomb hero per stakeholder instruction; file deleted. Entry kept for history. Authentic river/forest photograph still pending.
- 2026-09-07 `sundarbans-honey-bundle-500g-v2.webp`: source `~/Downloads/ChatGPT Image Sep 7, 2026, 11_42_29 PM.webp` (1024×1536, 463 KB, supplied design graphic, transparent WebP, ০.৫ কেজি ৳800 badge baked in). Processed with `cwebp -q 88 -metadata none` → 1024×1536 kept, 350 KB, metadata stripped. Replaces bundle-500g-v1 (file deleted); transparent background, same dimensions, no border. Baked-in price is visual copy, checkout stays live. Superseded 2026-09-08 by bundle-500g-v3 (file deleted).
- 2026-09-07 `sundarbans-honey-bundle-1kg-v2.webp`: source `~/Downloads/ChatGPT Image Sep 7, 2026, 11_37_09 PM.webp` (1024×1536, 470 KB, supplied design graphic, transparent WebP, ১ কেজি ৳1,600 badge baked in). Processed with `cwebp -q 88 -metadata none` → 1024×1536 kept, 362 KB, metadata stripped. Replaces bundle-1kg-v1 (file deleted); transparent background, same dimensions, no border. Baked-in price is visual copy, checkout stays live. Superseded 2026-09-08 by bundle-1kg-v3 (file deleted).
- 2026-09-08 `sundarbans-honey-bundle-500g-v3.webp`: source `~/Downloads/ChatGPT Image Sep 8, 2026, 02_19_52 AM.webp` (1024×1536, 243 KB, supplied design graphic with alpha). Processed with `cwebp -q 88 -metadata none` → 1024×1536 kept, 163 KB, metadata stripped. White price card baked in (০.৫ কেজি ৳800); page-side styling unchanged (transparent article, same size, no border). Baked-in price is visual copy, checkout stays live.
- 2026-09-08 `sundarbans-honey-bundle-1kg-v3.webp`: source `~/Downloads/ChatGPT Image Sep 8, 2026, 02_22_21 AM.webp` (1024×1536, 242 KB, supplied design graphic with alpha). Processed with `cwebp -q 88 -metadata none` → 1024×1536 kept, 165 KB, metadata stripped. White price card baked in (১ কেজি ৳1,600); page-side styling unchanged (transparent article, same size, no border). Baked-in price is visual copy, checkout stays live.

No other files processed yet. When further originals arrive, process per the Task 8 brief
(`cwebp -q 86 -metadata none` for stills, H.264/VP9 at max 1280px wide for
video, poster extracted at 00:00:01) and record source, permission, and edits
here.


## Reviews ship-gate (explicit approval required)

The omitted review section is not auto-shippable. Per the spec (Error and
edge states), shipping without genuine reviews needs explicit stakeholder approval. Status: pending — no approval invented or assumed. Code gate:
`honeyReviewsShipGate` in
`client/src/features/sundarbans-honey/content.ts` (`shipped: false`). Task 9
must not claim shippable without flipping that gate with both genuine reviews
and recorded approval.

## First asset request

Please supply, individually:

1. Sundarbans river/forest hero original, at least 2400px wide
2. Real natural hive photo
3. Real honey collection photo
4. Real collection video, highest-quality original
5. Murad Parvez portrait plus permission for statement/credentials
6. Three or four genuine reviews plus display permission
7. Four lifestyle and four serving images if image-led cards are desired
