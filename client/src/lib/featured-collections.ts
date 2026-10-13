import type { StorefrontProduct } from "./storefront-products";

export type FeaturedCollection = {
  slug: string;
  label: string;
  image: string;
  productSlugs: readonly string[];
};

export const TOP_SELLING_PRODUCT_SLUGS = [
  "katimon-mango",
  "honey-nut",
  "sundarbans-natural-honey",
  "kalojira-mixed",
  "litchi-flower-honey",
  "black-seed-flower-honey",
  "seed-nut-mix",
  "seed-mixed",
  "chia-seed",
  "sugarcane-juice-powder",
  "amsotto-pickle",
  "lachcha-semai",
  "mustard-oil",
  "beetroot-powder",
  "pure-ghee",
] as const;

export const TOP_SELLING_COLLECTION = {
  slug: "top-selling-products",
  label: "Top Selling Products - সেরা বিক্রিত পণ্য",
  productSlugs: TOP_SELLING_PRODUCT_SLUGS,
} as const;

export const FEATURED_COLLECTIONS = [
  {
    slug: "fresh-mango",
    label: "Fresh Mango-ফ্রেশ আম",
    image: "/categories/mango-1-320.webp",
    productSlugs: ["katimon-mango"],
  },
  {
    slug: "homemade",
    label: "Homemade-হোমমেড",
    image: "/categories/homemade-3-320.webp",
    productSlugs: ["amsotto-pickle", "jhalmuri-moshla", "homemade-pumpkin-bori", "mango-leather-pickle"],
  },
  {
    slug: "functional-food",
    label: "Functional Food-ফাংশনাল ফুড",
    image: "/categories/functional-food-1-320.webp",
    productSlugs: ["kalojira-mixed", "beetroot-powder"],
  },
  {
    slug: "honey",
    label: "Honey-মধু",
    image: "/categories/honey-4-320.webp",
    productSlugs: [
      "litchi-flower-honey",
      "sundarbans-natural-honey",
      "black-seed-flower-honey",
    ],
  },
  {
    slug: "oil-and-ghee",
    label: "Oil & Ghee-তেল ও ঘি",
    image: "/categories/oil-2-320.webp",
    productSlugs: ["mustard-oil", "pure-ghee"],
  },
  {
    slug: "jaggery",
    label: "Jaggery-গুড়",
    image: "/categories/jaggery-1-320.webp",
    productSlugs: ["sugarcane-juice-powder", "granulated-sugarcane-jaggery", "date-palm-patali", "liquid-date-jaggery", "granulated-jaggery"],
  },
  {
    slug: "semai",
    label: "Semai-সেমাই",
    image: "/categories/lachcha-1-320.webp",
    productSlugs: ["lachcha-semai"],
  },
  {
    slug: "dates",
    label: "Dates-খেজুর",
    image: "/categories/dates-1-320.webp",
    productSlugs: [],
  },
  {
    slug: "nuts-and-seeds",
    label: "Nuts & Seeds-বাদাম ও বীজ",
    image: "/categories/nuts-1-320.webp",
    productSlugs: ["seed-nut-mix", "seed-mixed", "chia-seed", "honey-nut"],
  },
] as const satisfies readonly FeaturedCollection[];

export function getFeaturedCollection(slug: string) {
  return FEATURED_COLLECTIONS.find((collection) => collection.slug === slug) ?? null;
}

export function getCollection(slug: string) {
  if (slug === TOP_SELLING_COLLECTION.slug) {
    return TOP_SELLING_COLLECTION;
  }

  return getFeaturedCollection(slug);
}

export function getProductsForCollection(
  products: StorefrontProduct[],
  collection: Pick<FeaturedCollection, "productSlugs">,
) {
  const assignedSlugs = new Set(collection.productSlugs);
  return products.filter((product) => assignedSlugs.has(product.slug));
}

export function getTopSellingProducts(products: StorefrontProduct[]) {
  const productsBySlug = new Map(products.map((product) => [product.slug, product]));
  const knownSlugs = new Set<string>(TOP_SELLING_PRODUCT_SLUGS);
  const orderedProducts = TOP_SELLING_PRODUCT_SLUGS.flatMap((slug) => {
    const product = productsBySlug.get(slug);
    return product ? [product] : [];
  });

  return orderedProducts.concat(products.filter((product) => !knownSlugs.has(product.slug)));
}

export function getVisibleFeaturedCollections(products: StorefrontProduct[]) {
  return FEATURED_COLLECTIONS.filter((collection) => getProductsForCollection(products, collection).length > 0);
}

// Homepage redesign (approved 2026-10-13, docs/design/2026-10-13-homepage): only these three
// categories appear on the homepage, as coloured cards with a cut-out food photo.
export const HOMEPAGE_CATEGORIES = [
  { slug: "fresh-mango", name: "ফ্রেশ আম", en: "Fresh Mango", image: "/home/category-mango.webp", color: "#F6B826", wide: false, light: false },
  { slug: "homemade", name: "হোমমেড", en: "Homemade", image: "/home/category-homemade.webp", color: "#E9A9A0", wide: true, light: false },
  { slug: "jaggery", name: "গুড়", en: "Jaggery", image: "/home/category-jaggery.webp", color: "#5B2D17", wide: true, light: true },
] as const;

export type ShelfTab = { label: string; keywords: readonly string[] };

// Category shelves on the homepage. Tabs split a category's products by name keywords;
// a tab only shows when at least one published product matches it.
export const HOMEPAGE_SHELVES = [
  {
    slug: "jaggery",
    title: "আমাদের গুড়",
    tabs: [
      { label: "পাটালী গুড়", keywords: ["পাটালী", "patali"] },
      { label: "ঝোলা গুড়", keywords: ["ঝোলা", "liquid", "jhola"] },
      { label: "দানাদার গুড়", keywords: ["দানাদার", "granulated"] },
    ],
  },
  {
    slug: "homemade",
    title: "আমাদের হোমমেড",
    tabs: [
      { label: "বড়ি", keywords: ["বড়ি", "bori"] },
      { label: "আচার", keywords: ["আচার", "pickle"] },
    ],
  },
] as const satisfies readonly { slug: string; title: string; tabs: readonly ShelfTab[] }[];

// The product priced in the big ৳ offer band.
export const HOMEPAGE_OFFER_PRODUCT_SLUG = "mango-leather-pickle";
// The brown signboard features বড়ি: the hero already sells the winter পাটালী.
export const HOMEPAGE_AD_PRODUCT_SLUG = "homemade-pumpkin-bori";

// ড় can be stored as one code point or as ড + nukta, so compare normalized text.
const normalizeName = (value: string) => value.normalize("NFC").toLowerCase();

export function groupProductsByTabs(products: StorefrontProduct[], tabs: readonly ShelfTab[]) {
  const remaining = new Set(products);
  const groups = tabs.flatMap((tab) => {
    const matches = products.filter((product) => {
      const name = normalizeName(product.name ?? "");
      return remaining.has(product) && tab.keywords.some((keyword) => name.includes(normalizeName(keyword)));
    });
    matches.forEach((product) => remaining.delete(product));
    return matches.length ? [{ label: tab.label, products: matches }] : [];
  });
  return remaining.size ? [...groups, { label: "অন্যান্য", products: Array.from(remaining) }] : groups;
}
