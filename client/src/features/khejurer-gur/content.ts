// খেজুরের গুড় landing ("গ · ফোঁটা", approved 2026-10-28): glossy lettering hero, three গুড় on a
// winding আলপনা line, recipe ticket, why-গুড় vine, multi-pack memo, দুই রঙ আলপনা footer.
export const GUR_PATH = "/step/khejurer-gur";
export const GUR_THANK_YOU_PATH = "/step/khejurer-gur/thank-you";
export const GUR_COMBO_PATH = "/step/khejurer-gur-combo";
export const GUR_COMBO_THANK_YOU_PATH = "/step/khejurer-gur-combo/thank-you";
export const GUR_CONFIRMATION_KEY = "khejurer-gur-order-confirmation-v1";
export const GUR_DELIVERY_CHARGE = 100;
/** The hero's cream, also used for the page canvas and the mobile browser bars. */
export const GUR_CANVAS = "#FBF4E8";

export const GUR_WHATSAPP_MESSAGE = "খেজুরের গুড় অর্ডার করতে চাই";
export const GUR_WHATSAPP_HREF = `https://wa.me/8801303103540?text=${encodeURIComponent(GUR_WHATSAPP_MESSAGE)}`;
export const GUR_PHONE_HREF = "tel:+8801310980289";
export const GUR_PHONE_LABEL = "০১৩১০-৯৮০২৮৯";
export const GUR_CREDIT_HREF = "https://www.arc-bangladesh.com/";

// Public images are cached as immutable: rename (bump -vN) when one changes.
const IMG = "/step/khejurer-gur";
export const GUR_IMAGES = {
  lettering: `${IMG}/gur-lettering-v1.webp`,
  khejurerLettering: `${IMG}/khejurer-lettering-v2.webp`,
  jhola: `${IMG}/bowl-jhola-v1.webp`,
  heroPour: `${IMG}/hero-pour-v3.mp4`,
  heroPourPoster: `${IMG}/hero-pour-poster-v2.webp`,
  bij: `${IMG}/bowl-bij-v1.webp`,
  patali: `${IMG}/slab-patali-v1.webp`,
  foilPatali: `${IMG}/foil-patali-v1.webp`,
  roundPatali: `${IMG}/round-patali-v1.webp`,
  danadar: `${IMG}/danadar-v1.webp`,
  gachiFog: `${IMG}/gachi-fog-v3.mp4`,
  gachiFogPoster: `${IMG}/gachi-fog-poster-v2.webp`,
  roadWalk: `${IMG}/road-walk-v3.mp4`,
  roadWalkPoster: `${IMG}/road-walk-poster-v2.webp`,
  roadCook: `${IMG}/road-cook-v3.mp4`,
  roadCookPoster: `${IMG}/road-cook-poster-v2.webp`,
  // the গাছি's walk cycle: 5 frames side by side (stand, left step, passing, right step, passing), 159×210 each
  roadWalkerCycle: `${IMG}/road-walker-cycle-v2.webp`,
  harvest: `${IMG}/pa-harvest-v1.webp`,
  cook: `${IMG}/pa-cook-v1.webp`,
  illJhola: `${IMG}/ill-jhola-v1.webp`,
  illBij: `${IMG}/ill-bij-v1.webp`,
  illPatali: `${IMG}/ill-patali-v1.webp`,
  quoteLettering: `${IMG}/quote-lettering-v1.webp`,
  quoteFrieze: `${IMG}/quote-frieze-800-v1.webp`,
  quoteFriezeLarge: `${IMG}/quote-frieze-1200-v1.webp`,
} as const;

/**
 * The six গুড় and the catalog product each one sells. Editorial copy only: names on the page,
 * the one-line description and the photo. Every price, size and stock figure comes from the catalog.
 */
export const GUR_PRODUCTS = [
  // Checkout only (see GUR_CHECKOUT_ONLY): first, so it tops the order memo. Its photo is the catalog's.
  { slug: "five-varieties-of-date-palm-jaggery", name: "খেজুরের গুড় কম্বো", line: "পাঁচ রকম খেজুরের গুড় একসাথে।", image: "", zoom: 1 },
  // Combo landing only (not on the main landing's memo), under the পাঁচ রূপ combo. Its photo is the catalog's.
  { slug: "liquid-date-jaggery-combo", name: "ঝোলা গুড় কম্বো", line: "ঘন ঝোলা গুড়, ৩ কেজি একসাথে।", image: "", zoom: 1 },
  { slug: "foil-wrapped-patali-jaggery", name: "ফয়েল পাটালি", line: "ফয়েলের ছোট ট্রেতে জমানো — ভাগ করে খাওয়া সহজ।", image: GUR_IMAGES.foilPatali, zoom: 1.05 },
  { slug: "round-patali-jaggery", name: "গোল পাটালি", line: "গোল চাকতি, ভাঙলে ভেতরে নরম দানা।", image: GUR_IMAGES.roundPatali, zoom: 1.05 },
  { slug: "date-palm-patali", name: "লম্বা পাটালি", line: "লম্বা জমাট পাটালি, কেটে কেটে খাওয়ার মতো।", image: GUR_IMAGES.patali, zoom: 0.94 },
  { slug: "liquid-date-jaggery", name: "ঝোলা গুড়", line: "ঘন, চকচকে — চামচ থেকে ধীরে গড়িয়ে পড়ে।", image: GUR_IMAGES.jhola, zoom: 1.15 },
  { slug: "granulated-jaggery", name: "দানাদার গুড়", line: "ঝুরঝুরে দানা — চা আর পায়েসে সহজে মেশে।", image: GUR_IMAGES.danadar, zoom: 1.05 },
  { slug: "chocolate-seed-jaggery", name: "বীজ গুড়", line: "নরম আর দানা দানা — জিভে দিলেই গলে যায়।", image: GUR_IMAGES.bij, zoom: 1.15 },
] as const;
export type GurProductMeta = (typeof GUR_PRODUCTS)[number];

/** Sold in the order memo but not one of the গুড় themselves: left out of the dial, the name ticker and the "৬ রকম" count. */
export const GUR_CHECKOUT_ONLY: readonly string[] = ["five-varieties-of-date-palm-jaggery", "liquid-date-jaggery-combo"];
/** What a combo holds, read out to screen readers on its order-memo row. */
export const GUR_COMBO_CONTENTS: Readonly<Record<string, { items: readonly { name: string; weight: string }[] }>> = {
  "five-varieties-of-date-palm-jaggery": {
    items: [
      { name: "ফয়েল পাটালি", weight: "৫০০ গ্রাম" },
      { name: "গোল পাটালি", weight: "৫০০ গ্রাম" },
      { name: "ঝোলা/লিকুইড", weight: "৫০০ গ্রাম" },
      { name: "দানাদার গুড়", weight: "৫০০ গ্রাম" },
      { name: "বীজ গুড়", weight: "৫০০ গ্রাম" },
    ],
  },
};
/** The গুড় themselves, as the story and the bar present them. */
export const GUR_VARIETIES = GUR_PRODUCTS.filter((p) => !GUR_CHECKOUT_ONLY.includes(p.slug));

/** The memo opens with these গুড় ticked at their ১ কেজি pack (or their first pack if the catalog has no ১ কেজি); the rest start unticked. */
export const GUR_PRESELECTED: readonly string[] = ["five-varieties-of-date-palm-jaggery", "round-patali-jaggery", "date-palm-patali", "liquid-date-jaggery"];
export const GUR_PRESELECTED_PACK = "১ কেজি";

export const GUR_USES = [
  { icon: "tea", title: "গুড়ের চা", gur: "বীজ গুড়" },
  { icon: "pitha", title: "ভাপা পিঠা", gur: "ঝোলা গুড়" },
  { icon: "payesh", title: "পায়েস", gur: "পাটালি" },
  { icon: "muri", title: "মুড়ি-গুড়", gur: "ঝোলা গুড়" },
  { icon: "ruti", title: "রুটি-পরোটা", gur: "ঝোলা গুড়" },
  { icon: "patali", title: "এমনি খান", gur: "পাটালি" },
] as const;

export const GUR_WHY = [
  { image: GUR_IMAGES.harvest, title: "খাঁটি রস থেকে", line: "কারখানায় সাদা করা নয়, কোনো কেমিক্যাল নেই" },
  { image: GUR_IMAGES.cook, title: "ধীরে জ্বাল", line: "উঠোনের চুলায় ঘণ্টার পর ঘণ্টা কাঠের আগুনে" },
  { icon: "minerals", title: "খনিজ থাকে", line: "আয়রন, পটাশিয়ামের মতো কিছু খনিজ" },
  { icon: "sweet", title: "অল্পেই মিষ্টি", line: "ক্যারামেলের মতো গভীর স্বাদ" },
] as const;

/** Bangla digits, no thousands separator (the landing's price style). */
export const bn = (value: number | string) => String(value).replace(/\d/g, (digit) => "০১২৩৪৫৬৭৮৯"[Number(digit)]);
export const taka = (value: number) => `৳${bn(value)}`;

export const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The two খেজুরের গুড় landings share one page. `main` sells every গুড় (and the combo); `combo` sells only the
 * কম্বো: its memo holds that one row, its photo melts into the page above the memo, and the dial shows the five
 * গুড় in the box without prices or add buttons.
 */
export type GurLanding = {
  path: string;
  thankYouPath: string;
  /** Products the order memo sells, in memo order. */
  checkout: readonly string[];
  /** Ticked when the memo opens. */
  preselected: readonly string[];
  /** The dial's গুড়. When `dialSells` is false they are shown for the story only, with no price or add button. */
  dial: readonly string[];
  dialSells: boolean;
  dialTitle: string;
  dialLine: string;
  /** Set on a single-product landing: its catalog photo sits above the memo, faded into the page. */
  photoSlug?: string;
  intro: string;
  pick: string;
  pickNote: string;
  barLabel: string;
  /** Under the hero's order button. */
  heroNote: string;
};
const varietySlugs = GUR_VARIETIES.map((p) => p.slug);
export const GUR_COMBO_SLUG = "five-varieties-of-date-palm-jaggery";
export const GUR_JHOLA_COMBO_SLUG = "liquid-date-jaggery-combo";
/** Orders made up only of these ship free (Merchant Suite: FREE_DELIVERY_SOLO_PRODUCT_IDS). */
export const GUR_FREE_DELIVERY_COMBOS: readonly string[] = [GUR_COMBO_SLUG, GUR_JHOLA_COMBO_SLUG];
export const GUR_LANDINGS = {
  main: {
    path: GUR_PATH, thankYouPath: GUR_THANK_YOU_PATH,
    checkout: GUR_PRODUCTS.map((p) => p.slug).filter((slug) => slug !== GUR_JHOLA_COMBO_SLUG), preselected: GUR_PRESELECTED,
    dial: varietySlugs, dialSells: true, dialTitle: "শীতের ছয় গুড়", dialLine: "চিনি নেই, ভেজাল নেই। পছন্দেরটা কার্টে যোগ করুন।",
    intro: "আপনার পছন্দের খেজুরের গুড় এবার আপনার ঠিকানায়।",
    pick: "গুড় ও পরিমাণ বেছে নিন", pickNote: "একাধিক বেছে নিতে পারেন",
    barLabel: `খেজুরের গুড় · ${bn(varietySlugs.length)}\u00a0রকম`,
    heroNote: "ক্যাশ অন ডেলিভারি · সারা দেশে ৳১০০",
  },
  combo: {
    path: GUR_COMBO_PATH, thankYouPath: GUR_COMBO_THANK_YOU_PATH,
    checkout: [GUR_COMBO_SLUG, GUR_JHOLA_COMBO_SLUG], preselected: [GUR_COMBO_SLUG],
    dial: ["foil-wrapped-patali-jaggery", "round-patali-jaggery", "liquid-date-jaggery", "granulated-jaggery", "chocolate-seed-jaggery"],
    dialSells: false, dialTitle: "কম্বোর পাঁচ গুড়", dialLine: "প্রতিটা ৫০০ গ্রাম, সব মিলিয়ে ২.৫ কেজি। চিনি নেই, ভেজাল নেই।",
    photoSlug: GUR_COMBO_SLUG,
    intro: "পাঁচ রকম খেজুরের গুড় একসাথে, আপনার ঠিকানায়।",
    pick: "কম্বো বেছে নিন", pickNote: "একটি বা দুটোই নিতে পারেন",
    barLabel: "গুড়ের কম্বো অফার",
    heroNote: "ক্যাশ অন ডেলিভারি · সারা দেশে ডেলিভারি ফ্রি",
  },
} satisfies Record<string, GurLanding>;

/**
 * Delivery for a memo, given the slug of every product on it. Combos ship free when they are the whole order
 * (either combo or both, any quantity), on either landing; with any other গুড় the normal charge applies. Merchant Suite applies the same
 * rule when it prices the order (server/shippingCalculation.js), so the page and the dashboard agree.
 */
export const gurDeliveryCharge = (slugs: readonly string[]) =>
  slugs.length > 0 && slugs.every((slug) => GUR_FREE_DELIVERY_COMBOS.includes(slug)) ? 0 : GUR_DELIVERY_CHARGE;
