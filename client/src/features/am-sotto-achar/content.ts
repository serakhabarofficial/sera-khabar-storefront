// আমসত্ত্ব আচার landing (approved 2026-10-20, "Taste": Fade hero, Path taste, Remotion recipe, Quiet footer).
export const AMSOTTO_SLUG = "mango-leather-pickle";
export const AMSOTTO_PATH = "/step/am-sotto-achar";
export const AMSOTTO_THANK_YOU_PATH = "/step/am-sotto-achar/thank-you";
export const AMSOTTO_CONFIRMATION_KEY = "am-sotto-achar-order-confirmation-v1";
export const AMSOTTO_DELIVERY_CHARGE = 100;
/** The hero's cream (`--cream`), also used for the page canvas and the mobile browser bars. */
export const AMSOTTO_CANVAS = "#fff6e6";

export const AMSOTTO_WHATSAPP_MESSAGE = "আমসত্ত্ব আচার অর্ডার করতে চাই";
export const AMSOTTO_WHATSAPP_HREF = `https://wa.me/8801303103540?text=${encodeURIComponent(AMSOTTO_WHATSAPP_MESSAGE)}`;
export const AMSOTTO_PHONE_HREF = "tel:+8801310980289";
export const AMSOTTO_PHONE_LABEL = "০১৩১০-৯৮০২৮৯";
export const AMSOTTO_CREDIT_HREF = "https://www.arc-bangladesh.com/";

// Public images are cached as immutable: rename (bump -vN) when one changes.
const IMG = "/step/am-sotto-achar";
export const AMSOTTO_HERO_IMAGE = `${IMG}/amsotto-hero-v1.webp`;
export const AMSOTTO_BITE_A_IMAGE = `${IMG}/amsotto-bite-a-v1.webp`;
export const AMSOTTO_BOWL_IMAGE = `${IMG}/amsotto-bowl-v1.webp`;

/** Editorial notes only; all prices, including comparison prices, come from the catalog. */
export const AMSOTTO_PACK_META: Record<string, { note: string }> = {
  "৫০০ গ্রাম": { note: "প্রথমবার স্বাদ নিতে" },
  "১ কেজি": { note: "পরিবারের জন্য সাশ্রয়ী" },
};

export const AMSOTTO_TASTES = [
  { name: "টক", step: "প্রথম কামড়", title: "তীব্র টক", line: "পাকা আমের আমসত্ত্ব। প্রথম ছোঁয়াতেই জিভ জেগে ওঠে।", ink: "#a67c00", icon: "sour" },
  { name: "ঝাল", step: "তারপর", title: "হালকা ঝাঁজ", line: "সরিষার তেল আর শুকনো মরিচ। ঝাল আছে, চোখে জল আনে না।", ink: "#c7361c", icon: "chili" },
  { name: "মিষ্টি", step: "শেষে", title: "গুড়ের আভাস", line: "শেষে গুড়ের হালকা মিষ্টি। তাই একটা টুকরোয় থামা যায় না।", ink: "#8a3b12", icon: "sweet" },
] as const;

/** Bangla digits, no thousands separator (the landing's price style). */
export const bn = (value: number | string) => String(value).replace(/\d/g, (digit) => "০১২৩৪৫৬৭৮৯"[Number(digit)]);
export const taka = (value: number) => `৳${bn(value)}`;

export const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
