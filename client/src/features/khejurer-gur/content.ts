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
  jhola: `${IMG}/bowl-jhola-v1.webp`,
  bij: `${IMG}/bowl-bij-v1.webp`,
  patali: `${IMG}/slab-patali-v1.webp`,
  harvest: `${IMG}/pa-harvest-v1.webp`,
  cook: `${IMG}/pa-cook-v1.webp`,
  illJhola: `${IMG}/ill-jhola-v1.webp`,
  illBij: `${IMG}/ill-bij-v1.webp`,
  illPatali: `${IMG}/ill-patali-v1.webp`,
} as const;

/**
 * The three গুড় and the catalog product each one sells. Editorial copy only: names on the page,
 * the one-line description and the photo. Every price, size and stock figure comes from the catalog.
 */
export const GUR_PRODUCTS = [
  { slug: "liquid-date-jaggery", name: "ঝোলা গুড়", line: "ঘন, চকচকে — চামচ থেকে ধীরে গড়িয়ে পড়ে।", uses: "পিঠা · রুটি · মুড়ি", image: GUR_IMAGES.jhola, zoom: 1.15, labelOffset: 17 },
  { slug: "chocolate-seed-jaggery", name: "বীজ গুড়", line: "নরম আর দানা দানা — জিভে দিলেই গলে যায়।", uses: "পায়েস · চা · চামচে", image: GUR_IMAGES.bij, zoom: 1.15, labelOffset: 22 },
  { slug: "date-palm-patali", name: "পাটালি গুড়", line: "জমাট পাটালি, ভাঙলে ভেতরে নরম দানা।", uses: "ভেঙে খান · মিষ্টান্ন · উপহার", image: GUR_IMAGES.patali, zoom: 0.94, labelOffset: 17 },
] as const;
export type GurProductMeta = (typeof GUR_PRODUCTS)[number];

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
  { image: GUR_IMAGES.bij, title: "খনিজ থাকে", line: "আয়রন, পটাশিয়ামের মতো কিছু খনিজ" },
  { image: GUR_IMAGES.jhola, title: "অল্পেই মিষ্টি", line: "ক্যারামেলের মতো গভীর স্বাদ" },
] as const;

/** Bangla digits, no thousands separator (the landing's price style). */
export const bn = (value: number | string) => String(value).replace(/\d/g, (digit) => "০১২৩৪৫৬৭৮৯"[Number(digit)]);
export const taka = (value: number) => `৳${bn(value)}`;

export const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
