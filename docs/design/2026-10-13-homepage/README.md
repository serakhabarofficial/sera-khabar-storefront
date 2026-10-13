# Homepage redesign — approved direction (2026-10-13)

Agreed with the owner over several mockup rounds. **Not implemented yet.** Open
`homepage-mockup.html` in a browser (it is self-contained) and pick variant
**ক · রঙিন কার্ড** at the top; that is the approved page. Desktop and phone frames
are shown side by side.

## Decisions

**Layout:** the "Market Poster" direction — giant সেরা খাবার wordmark hero with a
hand-lettered accent, real logo centred in the header, categories, product cards,
the big ৳ offer band, the story block, then the cash-memo footer.

**Palette — তেঁতুল + হলুদ (tamarind & turmeric):**

| Role | Hex |
|---|---|
| Background | `#FAF4EA` |
| Main (wordmark, titles, buttons, chips) | `#5B2D17` |
| Turmeric (order button, highlights) | `#F6B826` |
| Pink accent (hand-lettering, active line) | `#E2547A` |
| Card | `#F1E5D3` |
| Text | `#3A1D0F` |
| Muted text | `#7A6050` |

The owner rejected greens, earth-only palettes and the logo's own green/orange as
the site palette. The logo itself stays as is.

**Type:**
- Titles, headings, product and category names: **Noto Serif Bengali** (900 / 700).
- **All digits and prices: Atma** (700) — wrap numbers so they use Atma even inside Bangla text.
- Hand-lettered accents only (রাজশাহী থেকে, যা খুঁজছেন): **Galada**, sparingly.
- Body: Hind Siliguri. The owner rejected Baloo Da 2.

**Categories (আমাদের ক্যাটাগরিসমূহ, right below the hero):** only **ফ্রেশ আম,
হোমমেড, গুড়**; hide the others. Coloured-card style (owner's reference): a cut-out
food photo breaks out over the top-left of a rounded card (turmeric / soft pink
`#E9A9A0` / tamarind), name in Noto Serif Bengali, arrow, and a notched number
circle (০১ ০২ ০৩ in Atma). Desktop: 3 across. **Phone: one full-width card per
row** (owner said three across was too small). Cut-outs are in `cutouts/`
(mango from `katimon-mango-6kg.webp`). The গুড় card uses `jaggery-cut.webp`, the
owner's transparent "Jaggery Syrup and Sugar Still Life" shot (2026-10-13), replacing
the old `jag-cut.webp`. The হোমমেড card uses `homemade-cut.webp`, the owner's clean transparent
"Bowl of Golden Folded Crackers" shot (2026-10-13); it replaced the old
`bori-cut.webp`, which had a pale shadow patch.

Alternative kept for reference: `alt-categories-khata-pins.html` (notebook pages
with red/yellow push pins, hand-placed tilt) — liked earlier, then replaced.

**Product cards (আমাদের পণ্য):** the original Market Poster card — photo on top,
centred name, big Atma price, round + button. **No coloured circle behind the
photo**; the photo's white background must blend into the card (multiply + soft
edge mask). No extra colour on product images anywhere.

**Footer — ক্যাশ মেমো:** a pinned shop cash memo with torn bottom edge, ruled
lines, logo + "ক্যাশ মেমো" + tagline, "নং ২০২৬". Link rows (কেনাকাটা: ফ্রেশ আম,
হোমমেড, গুড়, সব পণ্য · যোগাযোগ: কল করুন, হোয়াটসঅ্যাপ করুন, আমাদের গল্প, পাইকারি
অর্ডার) in **Noto Serif Bengali, title colour** (not handwriting), dotted leaders,
arrows. Pink "ক্যাশ অন ডেলিভারি" rubber stamp. The **Arc Labs emblem is the
signature** on the signature line with "Designed & Engineered by" under it (keep
the existing WhatsApp link from `layout.tsx`). Copyright, address and the three
policy links sit below the memo.

**Motion (Emil Kowalski rules):** press to `scale(0.97)`, custom ease-out
`cubic-bezier(0.23,1,0.32,1)`, short durations, staggered rise-in once on load,
hover effects only on `(hover:hover) and (pointer:fine)`, everything off under
`prefers-reduced-motion`.

## Implementation notes

- The homepage hero is inline in `client/src/pages/home.tsx`; `components/hero.tsx` is dead code.
- Footer lives in `client/src/components/layout.tsx` (credit at ~line 698, tested in `layout.test.ts`).
- Category list comes from `client/src/lib/featured-collections.ts` (has tests).
- Product chips in আমাদের পণ্য should probably match the three categories — confirm with the owner.
- "দাম শুরু" prices in the mockup are samples; use real data.
- Optimise new images with `cwebp` before committing.

**FAQ — সাধারণ জিজ্ঞাসা (approved 2026-10-13, variant ক · মেসেঞ্জার):** sits right
above the cash-memo footer. A Messenger-style chat card (`#FFFDF8`, same 760px max width as the cash memo, radius 26px, no
hard border; shadow is a hairline ring plus tight warm-brown layers:
`0 0 0 1px rgba(58,29,15,.06), 0 1px 2px rgba(58,29,15,.04), 0 4px 8px -2px rgba(58,29,15,.05), 0 14px 28px -8px rgba(58,29,15,.08)`).
Header: leaf logo with green online dot, "অনলাইন · সাধারণত কয়েক সেকেন্ডে উত্তর দেয়".
Tapping a quick-reply question shows it as a tamarind bubble, a short typing indicator,
then the answer in a cream bubble. Bottom bar "অন্য প্রশ্ন? হোয়াটসঅ্যাপে লিখুন…" opens
WhatsApp. Questions/answers are placeholders until the owner confirms delivery times,
charges and storage advice. Other explored styles: `homepage-faq-variants.html`,
`homepage-faq-chat-variants.html`.

**Product ad — সাইনবোর্ড (approved 2026-10-13):** between আমাদের গুড় and আমাদের হোমমেড.
A full-width tamarind (`#5B2D17`) band; the owner's "Jaggery Syrup and Sugar Still Life"
photo (`cutouts/jaggery-ad.webp`, used as-is, no drop shadow) breaks out over the top
edge, tilted -4°. Text: Galada "শীতের নতুন গুড়" in turmeric, "খেজুরের পাটালী গুড়" in
Noto Serif Bengali 900 cream, one line of copy, "শুরু ৳৩৫০" in Atma turmeric, and an
"এখনই অর্ডার করুন" turmeric button. Price is a placeholder. Other explored styles:
`homepage-ad-variants.html`.
