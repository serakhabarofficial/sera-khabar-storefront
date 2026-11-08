// খেজুরের গুড় landing ("গ · ফোঁটা", approved 2026-10-28): glossy lettering hero, three গুড় on a
// winding আলপনা line, recipe ticket, why-গুড় vine, multi-pack memo, দুই রঙ আলপনা footer.
export const GUR_PATH = "/step/khejurer-gur";
export const GUR_THANK_YOU_PATH = "/step/khejurer-gur/thank-you";
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
  roadWalker: `${IMG}/road-walker-v1.webp`,
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
  { slug: "foil-wrapped-patali-jaggery", name: "ফয়েল পাটালি", line: "ফয়েলের ছোট ট্রেতে জমানো — ভাগ করে খাওয়া সহজ।", image: GUR_IMAGES.foilPatali, zoom: 1.05 },
  { slug: "round-patali-jaggery", name: "গোল পাটালি", line: "গোল চাকতি, ভাঙলে ভেতরে নরম দানা।", image: GUR_IMAGES.roundPatali, zoom: 1.05 },
  { slug: "date-palm-patali", name: "লম্বা পাটালি", line: "লম্বা জমাট পাটালি, কেটে কেটে খাওয়ার মতো।", image: GUR_IMAGES.patali, zoom: 0.94 },
  { slug: "liquid-date-jaggery", name: "ঝোলা গুড়", line: "ঘন, চকচকে — চামচ থেকে ধীরে গড়িয়ে পড়ে।", image: GUR_IMAGES.jhola, zoom: 1.15 },
  { slug: "granulated-jaggery", name: "দানাদার গুড়", line: "ঝুরঝুরে দানা — চা আর পায়েসে সহজে মেশে।", image: GUR_IMAGES.danadar, zoom: 1.05 },
  { slug: "chocolate-seed-jaggery", name: "বীজ গুড়", line: "নরম আর দানা দানা — জিভে দিলেই গলে যায়।", image: GUR_IMAGES.bij, zoom: 1.15 },
] as const;
export type GurProductMeta = (typeof GUR_PRODUCTS)[number];

/** The memo opens with these গুড় ticked at their ১ কেজি pack (or their first pack if the catalog has no ১ কেজি); the rest start unticked. */
export const GUR_PRESELECTED: readonly string[] = ["round-patali-jaggery", "date-palm-patali", "liquid-date-jaggery"];
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
