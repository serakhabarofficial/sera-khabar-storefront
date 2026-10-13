import Layout from "@/components/layout";
import headerLogo from "@assets/sera-khabar-leaf-logo.webp";
import PosterProductCard, { splitProductName } from "@/components/poster-product-card";
import {
  fetchStorefrontProducts,
  getProductImage,
  STOREFRONT_CATALOG_QUERY_OPTIONS,
  STOREFRONT_POLL_INTERVAL_MS,
  type StorefrontProduct,
} from "@/lib/storefront-products";
import { useQuery } from "@tanstack/react-query";
import { useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Link } from "wouter";
import { generatedStorefrontProducts } from "@/lib/generated-storefront-products";
import {
  getFeaturedCollection,
  getProductsForCollection,
  groupProductsByTabs,
  HOMEPAGE_AD_PRODUCT_SLUG,
  HOMEPAGE_CATEGORIES,
  HOMEPAGE_OFFER_PRODUCT_SLUG,
  HOMEPAGE_SHELVES,
} from "@/lib/featured-collections";
import { BanglaNumber, toBanglaDigits, withNumeralDigits } from "@/lib/bangla-digits";
import { CONTACT_DETAILS, POLICY_FACTS } from "@/lib/site-pages";

// Approved homepage redesign (2026-10-13): "Market Poster" in tamarind + turmeric.
// Spec and mockup: docs/design/2026-10-13-homepage/. Styles live in client/src/poster.css.

const WHATSAPP_ORDER_HREF = `${CONTACT_DETAILS.whatsappHref}?text=${encodeURIComponent("আমসত্ত্ব আচার অর্ডার করতে চাই")}`;

function productsInCollection(products: StorefrontProduct[], slug: string) {
  const collection = getFeaturedCollection(slug);
  return collection ? getProductsForCollection(products, collection) : [];
}

// Cheapest orderable size, for "থেকে শুরু" prices.
function getStartingOption(product: StorefrontProduct) {
  const options = (product.variants ?? [])
    .filter((variant) => variant.available !== false && Number.isFinite(Number(variant.price)))
    .map((variant) => ({ price: Number(variant.price), size: String(variant.attributes?.size ?? "") }))
    .sort((a, b) => a.price - b.price);
  return options[0] ?? { price: Number(product.price), size: "" };
}

// Homepage hero (approved 2026-10-14, "Memo" in docs/design/2026-10-14-hero/poster-variants.html): the
// season's গুড় written up on the same pinned cash memo as the footer. Sizes and prices come from the live
// catalog, so a price change in the dashboard shows here without a deploy.
function MemoHero({ product }: { product?: StorefrontProduct }) {
  const sizes = (product?.variants ?? [])
    .filter((variant) => variant.available !== false && Number.isFinite(Number(variant.price)))
    .map((variant) => ({ size: String(variant.attributes?.size ?? ""), price: Number(variant.price) }))
    .sort((a, b) => a.price - b.price);
  const href = product ? `/product/${product.slug}` : "/products";

  return (
    <div className="wrap">
      <section className="mh">
        <div className="memo-w mh-w">
          <span className="tack" />
          <div className="memo">
            <div className="memo-top">
              <img src={headerLogo} alt="সেরা খাবার" decoding="async" />
              <div className="memo-title">
                <b>শীতের প্রথম ব্যাচ</b>
                <span>রাজশাহী থেকে সরাসরি আপনার ঘরে।</span>
              </div>
              <div className="memo-no">
                নং <span className="num">{toBanglaDigits(String(new Date().getFullYear()))}</span>
                <br />
                তারিখ: আজ
              </div>
            </div>
            <div className="mh-body">
              <div>
                <span className="script mh-kick" data-load-step="">এ বছরের নতুন</span>
                <h1 className="mh-title" data-load-step="">খেজুরের পাটালী</h1>
                {sizes.length ? (
                  <div className="mh-rows" data-load-step="">
                    {sizes.map((option) => (
                      <Link key={option.size} href={href} className="memo-row">
                        {option.size}
                        <em>৳<BanglaNumber value={option.price} /></em>
                      </Link>
                    ))}
                    <div className="memo-row">
                      ডেলিভারি (৳{toBanglaDigits(POLICY_FACTS.freeDeliveryThreshold)}+ অর্ডারে)
                      <em>ফ্রি</em>
                    </div>
                  </div>
                ) : null}
                <div className="mh-ctas" data-load-step="">
                  <Link href={href} className="btn-royal press">
                    এখনই অর্ডার করুন <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </div>
              <div className="mh-art">
                <div className="stampc" aria-hidden="true">
                  ক্যাশ অন
                  <br />
                  ডেলিভারি
                  <br />· সারা দেশে ·
                </div>
                <img
                  src="/home/hero-jaggery-memo.webp"
                  srcSet="/home/hero-jaggery-memo-640.webp 640w, /home/hero-jaggery-memo.webp 960w"
                  sizes="(min-width: 860px) 560px, 100vw"
                  alt="খেজুরের পাটালী, ঝোলা ও দানাদার গুড়"
                  width={960}
                  height={960}
                  fetchPriority="high"
                  decoding="async"
                  data-page-settle=""
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function ProductGrid({ products, bySize = false }: { products: StorefrontProduct[]; bySize?: boolean }) {
  if (!products.length) {
    return (
      <div className="c-list">
        <p className="c-empty">নতুন পণ্য শীঘ্রই আসছে।</p>
      </div>
    );
  }
  return (
    <div className="c-list">
      {products.flatMap((product) =>
        // Shelves show each size (e.g. ৫০০ গ্রাম and ১ কেজি) as its own card.
        bySize && product.variants?.length
          ? product.variants.map((variant) => (
              <PosterProductCard key={`${product.id || product.slug}-${variant.id}`} product={product} variant={variant} />
            ))
          : [<PosterProductCard key={product.id || product.slug} product={product} />],
      )}
    </div>
  );
}

function CategoryCards() {
  return (
    <section className="cx-sec">
      <div className="wrap">
        <h2 data-reveal="">আমাদের ক্যাটাগরিসমূহ</h2>
        <span className="script sub" data-reveal="">যা খুঁজছেন</span>
        <div className="fr-grid">
          {HOMEPAGE_CATEGORIES.map((category, index) => (
            <Link
              key={category.slug}
              href={`/collection/${category.slug}`}
              className={`fr${category.wide ? " wide" : ""}${category.light ? " light" : ""}`}
              style={{ "--c": category.color } as CSSProperties}
              data-reveal=""
            >
              <span className="fr-card" />
              <img src={category.image} alt="" loading="eager" decoding="async" />
              <span className="fr-name">{category.name}</span>
              <span className="fr-go" aria-hidden="true">→</span>
              <span className="fr-no" aria-hidden="true">
                <span>{toBanglaDigits(String(index + 1).padStart(2, "0"))}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function AllProductsSection({ products, failed }: { products: StorefrontProduct[]; failed: boolean }) {
  const chips = [
    { slug: "", label: "সব", products },
    ...HOMEPAGE_CATEGORIES.map((category) => ({
      slug: category.slug,
      label: category.name,
      products: productsInCollection(products, category.slug),
    })).filter((chip) => chip.products.length > 0),
  ];
  const [activeSlug, setActiveSlug] = useState("");
  const active = chips.find((chip) => chip.slug === activeSlug) ?? chips[0];

  return (
    <section className="c-sec">
      <div className="wrap">
        <div className="c-sec-head" data-reveal="">
          <h2>আমাদের পণ্য</h2>
          {chips.length > 2 ? (
            <div className="c-tabs" role="tablist" aria-label="ক্যাটাগরি">
              {chips.map((chip) => (
                <button
                  key={chip.slug || "all"}
                  type="button"
                  role="tab"
                  aria-selected={chip === active}
                  className={`chip press${chip === active ? " on" : ""}`}
                  onClick={() => setActiveSlug(chip.slug)}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        {failed ? (
          <div className="c-list">
            <p className="c-empty">এই মুহূর্তে পণ্য দেখানো যাচ্ছে না। একটু পরে আবার চেষ্টা করুন।</p>
          </div>
        ) : (
          <ProductGrid key={active.slug || "all"} products={active.products} />
        )}
        <div className="c-rule" />
      </div>
    </section>
  );
}

function CategoryShelf({ title, groups }: { title: string; groups: ReturnType<typeof groupProductsByTabs> }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = groups[activeIndex] ?? groups[0];
  const showTabs = groups.length > 1;

  return (
    <section className="c-sec">
      <div className="wrap">
        <div className="c-sec-head" data-reveal="">
          <h2>{title}</h2>
          {showTabs ? (
            <div className="c-tabs" role="tablist" aria-label={title}>
              {groups.map((group, index) => (
                <button
                  key={group.label}
                  type="button"
                  role="tab"
                  aria-selected={group === active}
                  className={`chip press${group === active ? " on" : ""}`}
                  onClick={() => setActiveIndex(index)}
                >
                  {group.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <ProductGrid
          key={active.label}
          bySize
          products={showTabs ? active.products : groups.flatMap((group) => group.products)}
        />
        <div className="c-rule" />
      </div>
    </section>
  );
}

function OfferBand({ product }: { product: StorefrontProduct }) {
  const { price, size } = getStartingOption(product);
  const { bangla } = splitProductName(product.name);
  const image = getProductImage(product);

  return (
    <Link href={`/product/${product.slug}`} className="c-offer" data-reveal="">
      {image ? <img className="float f1" src={image} alt="" loading="lazy" decoding="async" /> : null}
      <img className="float f2" src="/home/hero-bori.webp" alt="" loading="lazy" decoding="async" />
      <div className="c-big">৳{toBanglaDigits(price)}</div>
      <span className="c-ribbon">{withNumeralDigits(`${bangla}, ${size ? `${size} ` : ""}থেকে শুরু`)}</span>
    </Link>
  );
}

// "Signboard" ad for the আমসত্ত্ব আচার (the hero already sells the winter পাটালী): a giant yellow
// "আচার" behind the bowl, lit by a warm spotlight (approved 2026-10-14, a mix of the "Glow" and "Big word"
// variants in docs/design/2026-10-14-hero/achar-board-variants.html). Priced from the catalog; if the
// product is not published, the button takes the order on WhatsApp.
function AcharAdBoard({ product }: { product?: StorefrontProduct }) {
  const startingPrice = product ? getStartingOption(product).price : null;

  return (
    <section className="ad-board" data-reveal="">
      <div className="wrap ad-b-in">
        <span className="script ad-tag">টক-ঝাল-মিষ্টি</span>
        <h2 className="ad-b-title">
          <span className="ad-b-pre">আমসত্ত্ব</span>
          <span className="ad-b-word">আচার</span>
        </h2>
        <div className="ad-b-art">
          {startingPrice != null && Number.isFinite(startingPrice) ? (
            <span className="ad-b-stamp">
              <span>
                <b>৳<BanglaNumber value={startingPrice} /></b>
                <small>থেকে শুরু</small>
              </span>
            </span>
          ) : null}
          <img className="ad-b-img" src="/home/achar-ad.webp" alt="আমসত্ত্ব আচার" width={880} height={880} loading="lazy" decoding="async" />
        </div>
        <p className="ad-b-lede">খাঁটি আমসত্ত্বে তৈরি, মিষ্টি-টক-ঝালের দারুণ সমন্বয়।</p>
        <div className="ad-b-buy">
          {product ? (
            <Link href={`/product/${product.slug}`} className="btn-sun press">
              এখনই অর্ডার করুন <i />
            </Link>
          ) : (
            <a href={WHATSAPP_ORDER_HREF} target="_blank" rel="noopener noreferrer" className="btn-sun press">
              এখনই অর্ডার করুন <i />
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

// Answers come from POLICY_FACTS so they never disagree with checkout and the policy pages.
// Storage and wholesale answers are placeholders until the owner confirms them.
const FAQS = [
  [
    "অর্ডার করলে কত দিনে পাবো?",
    `ঢাকার ভেতরে ${POLICY_FACTS.dhakaDeliveryDays.replace(" days", "")} দিনে, ঢাকার বাইরে ${POLICY_FACTS.outsideDhakaDeliveryDays.replace(" days", "")} দিনে পৌঁছে যায়।`,
  ],
  [
    "ডেলিভারি চার্জ কত?",
    `সারাদেশে ডেলিভারি চার্জ ৳${POLICY_FACTS.deliveryCharge}। ৳${POLICY_FACTS.freeDeliveryThreshold} বা তার বেশি অর্ডারে ডেলিভারি ফ্রি।`,
  ],
  ["টাকা কীভাবে দেবো?", "ক্যাশ অন ডেলিভারি। পণ্য হাতে পেয়ে, দেখে তারপর টাকা দিন।"],
  [
    "পণ্য ভাঙা বা খারাপ এলে কী করবো?",
    "ডেলিভারির সময়ই খুলে দেখুন। সমস্যা থাকলে ছবি তুলে হোয়াটসঅ্যাপে পাঠান, আমরা বদলে দেবো।",
  ],
  [
    "গুড় আর আচার কত দিন ভালো থাকে?",
    "পাটালী গুড় ফ্রিজে কয়েক মাস ভালো থাকে। আচার শুকনো চামচে তুলুন আর ঠান্ডা, শুকনো জায়গায় রাখুন।",
  ],
  ["পাইকারি অর্ডার করা যায়?", "হ্যাঁ। পরিমাণ জানিয়ে কল বা হোয়াটসঅ্যাপ করুন, আমরা দাম জানিয়ে দেবো।"],
] as const;

function FaqChat() {
  const shouldReduceMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(typingTimer.current), []);

  const ask = (index: number) => {
    setActiveIndex(index);
    window.clearTimeout(typingTimer.current);
    if (shouldReduceMotion) {
      setIsTyping(false);
      return;
    }
    setIsTyping(true);
    typingTimer.current = window.setTimeout(() => setIsTyping(false), 650);
  };
  const [question, answer] = FAQS[activeIndex];

  return (
    <section className="wrap fq" data-reveal="">
      <div className="fq-ctr">
        <span className="script fq-kick">প্রশ্ন আছে?</span>
        <h2>সাধারণ জিজ্ঞাসা</h2>
      </div>
      <div className="ch-card">
        <div className="ch-head">
          <span className="ch-av">
            <img src="/home/leaf-mark.webp" alt="" />
            <i />
          </span>
          <span className="ch-who">
            <b>সেরা খাবার</b>
            <small>অনলাইন · সাধারণত কয়েক সেকেন্ডে উত্তর দেয়</small>
          </span>
        </div>
        <div className="ch-thread" aria-live="polite" key={activeIndex}>
          <div className="ch-row me">
            <div className="bub me">{question}</div>
            <small className="ch-meta">
              এইমাত্র <b>✓✓</b>
            </small>
          </div>
          <div className="ch-row shop">
            <img className="av" src="/home/leaf-mark.webp" alt="" />
            {isTyping ? (
              <div className="bub shop typing" aria-label="লিখছে">
                <i />
                <i />
                <i />
              </div>
            ) : (
              <div className="bub shop">{withNumeralDigits(answer)}</div>
            )}
          </div>
        </div>
        <div className="ch-quick">
          <span>প্রশ্ন বেছে নিন</span>
          <div className="ch-chips">
            {FAQS.map(([faqQuestion], index) => (
              <button
                key={faqQuestion}
                type="button"
                className={`press${index === activeIndex ? " on" : ""}`}
                aria-pressed={index === activeIndex}
                onClick={() => ask(index)}
              >
                {faqQuestion}
              </button>
            ))}
          </div>
        </div>
        <a className="ch-input press" href={CONTACT_DETAILS.whatsappHref} target="_blank" rel="noopener noreferrer">
          <span>অন্য প্রশ্ন? হোয়াটসঅ্যাপে লিখুন…</span>
          <i aria-hidden="true">➤</i>
        </a>
      </div>
    </section>
  );
}

export default function Home() {
  const { data: catalogProducts = [], isError: isCatalogError } = useQuery({
    queryKey: ["merchant-suite-products-listing"],
    queryFn: fetchStorefrontProducts,
    ...STOREFRONT_CATALOG_QUERY_OPTIONS,
    initialData: generatedStorefrontProducts,
    initialDataUpdatedAt: 0,
    refetchInterval: STOREFRONT_POLL_INTERVAL_MS,
  });
  const homepageProducts = catalogProducts.map((product) => {
    const snapshotProduct = generatedStorefrontProducts.find((snapshot) => snapshot.slug === product.slug);
    return product.compare_at_price == null && snapshotProduct?.compare_at_price != null
      ? { ...product, compare_at_price: snapshotProduct.compare_at_price }
      : product;
  });
  const offerProduct = homepageProducts.find((product) => product.slug === HOMEPAGE_OFFER_PRODUCT_SLUG);
  const jaggeryProducts = productsInCollection(homepageProducts, "jaggery");
  const shelves = HOMEPAGE_SHELVES.map((shelf) => ({
    ...shelf,
    groups: groupProductsByTabs(productsInCollection(homepageProducts, shelf.slug), shelf.tabs),
  }));
  const renderShelf = (slug: string) => {
    const shelf = shelves.find((item) => item.slug === slug);
    return shelf && shelf.groups.length ? <CategoryShelf key={slug} title={shelf.title} groups={shelf.groups} /> : null;
  };

  return (
    <Layout>
      <div className="sk">
        {/* Hero Section */}
        <MemoHero product={jaggeryProducts.find((product) => product.name.includes("পাটালী"))} />

        {/* Categories Section */}
        <CategoryCards />

        {/* Products Section */}
        <AllProductsSection products={homepageProducts} failed={isCatalogError && catalogProducts.length === 0} />

        {/* Offer Section */}
        {offerProduct ? <OfferBand product={offerProduct} /> : null}

        {/* Story Section */}
        <div className="wrap">
          <section className="c-story" data-reveal="">
            <h2 className="script">রাজশাহীর রান্নাঘরের গল্প</h2>
            <p>
              <b>সেরা খাবার</b> শুরু হয়েছিল পরিবারের পুরনো রেসিপি থেকে। প্রতিটি বড়ি রোদে শুকানো, প্রতিটি আচার ছোট হাঁড়িতে
              জ্বাল দেওয়া। আমরা যতটুকু বানাই, ততটুকুই বিক্রি করি।
            </p>
          </section>
        </div>

        {/* Jaggery Shelf */}
        {renderShelf("jaggery")}

        {/* Achar Ad */}
        <AcharAdBoard product={homepageProducts.find((product) => product.slug === HOMEPAGE_AD_PRODUCT_SLUG)} />

        {/* Homemade Shelf */}
        {renderShelf("homemade")}

        {/* FAQ Section */}
        <FaqChat />
      </div>
    </Layout>
  );
}
