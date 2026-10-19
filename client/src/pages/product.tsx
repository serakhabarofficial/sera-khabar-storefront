import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { flushSync } from "react-dom";
import useEmblaCarousel from "embla-carousel-react";
import "@videojs/react/video/skin.css";
import { Gesture, PlayButton } from "@videojs/react";
import { Video, VideoPlayer, VideoSkin } from "@videojs/react/video";
import { useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Minus, Play, Plus, VolumeX } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import PosterProductCard, { splitProductName } from "@/components/poster-product-card";
import RecentlyViewed from "@/components/recently-viewed";
import { useCart } from "@/contexts/cart-context";
import Layout from "@/components/layout";
import { useDockContactProduct } from "@/components/dock-contact";
import { ProductMosaic } from "@/components/product-mosaic";
import OrderDialog, { type OrderDialogBundle } from "@/components/order-dialog";
import { toGoogleAnalyticsItem, trackGoogleEcommerceEvent } from "@/lib/google-analytics";
import { getProductDetailSections } from "@/lib/product-details";
import {
  fetchStorefrontProduct,
  fetchStorefrontProductInventory,
  fetchStorefrontProducts,
  findGeneratedStorefrontProduct,
  formatProductPrice,
  getCachedStorefrontProduct,
  buildProductSrcSetIndex,
  getProductGallery,
  getProductImage,
  getProductNumericId,
  isProductOrderable,
  mergeInventory,
  removeCachedStorefrontProduct,
  setCachedStorefrontProduct,
  STOREFRONT_CATALOG_QUERY_OPTIONS,
  STOREFRONT_POLL_INTERVAL_MS,
  type StorefrontProduct,
} from "@/lib/storefront-products";
import { generatedStorefrontProducts } from "@/lib/generated-storefront-products";
import { recordRecentlyViewedSlug } from "@/lib/recently-viewed";
import { getDefaultBundleIndex } from "@/lib/product-selection";
import { toBanglaDigits } from "@/lib/bangla-digits";
import { MAX_LINE_QUANTITY } from "@shared/order-limits";
import { FEATURED_COLLECTIONS } from "@/lib/featured-collections";
import { POLICY_FACTS } from "@/lib/site-pages";
import { formatTaka, getSizeOffers } from "@/lib/product-sizes";

// Use the direct catalog image URL. Vercel's image optimizer currently
// rejects these Supabase URLs in production (INVALID_IMAGE_OPTIMIZE_REQUEST),
// so we skip it and rely on Supabase's own CDN.
const optimizedImage = (url: string | null | undefined) => url ?? "";

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(el);
    // Fallback: some mobile Safari engines never fire the initial
    // intersection callback, leaving content stuck at opacity:0 (blank page).
    // Reveal after a short delay so the page is never invisible.
    const fallback = window.setTimeout(() => setInView(true), 1000);
    return () => {
      observer.disconnect();
      window.clearTimeout(fallback);
    };
  }, []);
  return [ref, inView] as const;
}

function getMerchantSlug(slug: string) {
  return slug || "";
}

// The last details page restates the published delivery and payment policy (site-pages.ts).
const DELIVERY_POINTS = [
  "পেমেন্ট শুধু ক্যাশ অন ডেলিভারি",
  "ঢাকায় ১–২ দিন, ঢাকার বাইরে ২–৩ দিনে ডেলিভারি",
  `সারাদেশে ডেলিভারি চার্জ ৳${toBanglaDigits(POLICY_FACTS.deliveryCharge)}; ৳${toBanglaDigits(POLICY_FACTS.freeDeliveryThreshold)}+ অর্ডারে ফ্রি`,
  "পণ্যে সমস্যা হলে ডেলিভারির ২৪ ঘণ্টার মধ্যে জানান",
];
const STRIP_ITEMS = ["ক্যাশ অন ডেলিভারি", "সারাদেশে ডেলিভারি", `৳${toBanglaDigits(POLICY_FACTS.freeDeliveryThreshold)}+ অর্ডারে ফ্রি ডেলিভারি`, "রাজশাহী থেকে", "সেরা খাবার"];

function ProductSkeleton() {
  return (
    <div className="min-h-screen bg-white">
      <div className="grid grid-cols-1 lg:grid-cols-12">
        <div className="lg:col-span-7 bg-white p-[10px] md:p-16 xl:p-20">
          <div className="mx-auto aspect-square w-full max-w-[1080px] animate-pulse rounded-[8px] bg-[#ededed]" />
        </div>
        <div className="lg:col-span-5 flex flex-col gap-5 bg-white p-8 md:p-16">
          <div className="h-9 w-2/3 animate-pulse rounded bg-[#ededed]" />
          <div className="h-6 w-1/3 animate-pulse rounded bg-[#ededed]" />
          <div className="mt-4 h-12 w-1/2 animate-pulse rounded-[4px] bg-[#ededed]" />
          <div className="mt-8 h-12 w-full animate-pulse rounded-[4px] bg-black/10" />
        </div>
      </div>
    </div>
  );
}

// Sera Khabar has no product reels yet; the reels section stays hidden until
// entries are added here (src = MP4 URL, poster = small WebP still in /public/reels).
const REEL_MEDIA: readonly { src: string; poster: string }[] = [];

// Public Video.js skin settings: match the reel card corners and the brand yellow.
// The skin's frosted-glass blur is switched off: re-blurring the video under the
// control bars on every frame of a swipe made the carousel stutter on phones, so the
// surfaces use a solid translucent dark instead.
const REEL_SKIN_STYLE = {
  "--media-accent-color": "#FBBB14",
  "--media-border-color": "transparent",
  "--media-border-radius": "6px",
  "--media-object-fit": "contain",
  "--media-backdrop-filter-surface": "none",
  "--media-backdrop-filter-indicator": "none",
  "--media-backdrop-filter-dialog": "none",
  "--media-popover": "oklch(0% 0 0 / 0.55)",
} as CSSProperties;

const HONEY_NUT_REEL_MEDIA = [
  {
    src: "https://res.cloudinary.com/n0d6bs08/video/upload/f_auto,q_auto/FDown.vn_Facebook_Video_Downloader_720p_HD__7925.mp4",
    poster: "https://res.cloudinary.com/n0d6bs08/video/upload/so_1,w_480,f_auto,q_auto/FDown.vn_Facebook_Video_Downloader_720p_HD__7925.jpg",
  },
  {
    src: "https://res.cloudinary.com/n0d6bs08/video/upload/f_auto,q_auto/snapsave-app_1432224402135483_hd.mp4",
    poster: "https://res.cloudinary.com/n0d6bs08/video/upload/so_1,w_480,f_auto,q_auto/snapsave-app_1432224402135483_hd.jpg",
  },
  {
    src: "https://res.cloudinary.com/n0d6bs08/video/upload/f_auto,q_auto/FDown.vn_Facebook_Video_Downloader_720p_HD__8e09.mp4",
    poster: "https://res.cloudinary.com/n0d6bs08/video/upload/so_1,w_480,f_auto,q_auto/FDown.vn_Facebook_Video_Downloader_720p_HD__8e09.jpg",
  },
] as const;

export default function ProductPage({ params }: { params?: { id: string } }) {
  const slug = getMerchantSlug(params?.id || "");
  const honeyNutReelMedia = slug === "honey-nut" ? HONEY_NUT_REEL_MEDIA : null;
  const reelMedia = honeyNutReelMedia ? honeyNutReelMedia : REEL_MEDIA;
  const reelCount = reelMedia.length;
  const { addToCart } = useCart();
  const [orderOpen, setOrderOpen] = useState(false);
  const [selectedBundleIdx, setSelectedBundleIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [availabilityBlocked, setAvailabilityBlocked] = useState(false);

  const [activeImage, setActiveImage] = useState(0);
  const [currentReel, setCurrentReel] = useState(0);
  // The Video.js player (with sound) mounts only after a tap. Until then every reel
  // plays as a plain muted loop while the section is on screen.
  const [playerReel, setPlayerReel] = useState<number | null>(null);
  const [reelsInView, setReelsInView] = useState(false);
  const previewVideoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  // Only one <video> is ever mounted. Mounting all three attaches three hardware
  // decoders to layers that Embla re-transforms every frame, which is what makes the
  // horizontal drag stutter on real phones but not on a desktop localhost.
  const activeReelVideoRef = useRef<HTMLVideoElement | null>(null);
  const viewedGoogleItemRef = useRef("");
  const [cachedProduct, setCachedProduct] = useState<StorefrontProduct | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const [galleryRef, galleryApi] = useEmblaCarousel({
    align: "start",
    containScroll: false,
    loop: false,
    skipSnaps: false,
  });
  const [reelRef, reelApi] = useEmblaCarousel({
    align: "start",
    containScroll: false,
    duration: 35,
    loop: true,
    skipSnaps: false,
  });
  const startReel = (i: number, fromTime = 0) => {
    // Mount synchronously so play() still runs inside the tap: iOS only allows
    // unmuted playback that starts within the user's gesture.
    flushSync(() => setPlayerReel(i));
    const video = activeReelVideoRef.current;
    if (!video) return;
    // Pick up where the muted preview was, so tapping just turns the sound on.
    if (fromTime > 0) {
      if (video.readyState >= 1) video.currentTime = fromTime;
      else video.addEventListener("loadedmetadata", () => (video.currentTime = fromTime), { once: true });
    }
    void video.play().catch(() => undefined);
  };
  const goReel = (dir: number) => {
    if (reelApi) {
      if (dir < 0) reelApi.scrollPrev();
      if (dir > 0) reelApi.scrollNext();
      return;
    }
    setCurrentReel((i) => Math.min(reelCount - 1, Math.max(0, i + dir)));
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable
      ) {
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goReel(-1);
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goReel(1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [reelApi]);
  useEffect(() => {
    if (!reelApi) return;
    // Pause only when a pointer really drags the track sideways. Embla's pointerDown
    // fired on every tap (fighting the player's tap-to-toggle), and its scroll event
    // keeps firing for seconds while an arrow-driven slide settles, pausing a reel
    // the shopper had just started.
    const root = reelApi.rootNode();
    let dragStartX: number | null = null;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      dragStartX = target?.closest("button, [role='slider'], input") ? null : event.clientX;
    };
    const pauseReelsDuringDrag = (event: PointerEvent) => {
      if (dragStartX === null || Math.abs(event.clientX - dragStartX) < 10) return;
      dragStartX = null;
      activeReelVideoRef.current?.pause();
      // Freeze the previews on their current frame so the moving track isn't decoding.
      previewVideoRefs.current.forEach((video) => video?.pause());
    };
    const endDrag = () => {
      dragStartX = null;
    };
    root.addEventListener("pointerdown", onPointerDown);
    root.addEventListener("pointermove", pauseReelsDuringDrag);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    return () => {
      root.removeEventListener("pointerdown", onPointerDown);
      root.removeEventListener("pointermove", pauseReelsDuringDrag);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
    };
  }, [reelApi]);
  useEffect(() => {
    if (!reelApi) return;
    const syncActiveReel = () => {
      const selected = reelApi.selectedScrollSnap();
      setCurrentReel(selected);
      // Leaving a slide tears its player down; it goes back to a muted preview.
      setPlayerReel((reel) => (reel === selected ? reel : null));
    };
    const resumePreviews = () =>
      previewVideoRefs.current.forEach((video) => void video?.play().catch(() => undefined));
    syncActiveReel();
    reelApi.on("select", syncActiveReel);
    reelApi.on("reInit", syncActiveReel);
    reelApi.on("settle", resumePreviews);
    return () => {
      reelApi.off("select", syncActiveReel);
      reelApi.off("reInit", syncActiveReel);
      reelApi.off("settle", resumePreviews);
    };
  }, [reelApi]);
  useEffect(() => {
    if (!reelApi) return;
    // Previews only download and play while the reels are on screen.
    const observer = new IntersectionObserver(([entry]) => setReelsInView(entry.isIntersecting), {
      rootMargin: "100px 0px",
    });
    observer.observe(reelApi.rootNode());
    return () => observer.disconnect();
  }, [reelApi]);
  const showPreviews = reelsInView && !shouldReduceMotion;
  const { data: merchantProduct, isFetchedAfterMount, isSuccess, refetch } = useQuery({
    queryKey: ["merchant-suite-product", slug],
    queryFn: () => fetchStorefrontProduct(slug),
    enabled: Boolean(slug),
    refetchInterval: STOREFRONT_POLL_INTERVAL_MS,
  });

  const { data: merchantInventory } = useQuery({
    queryKey: ["merchant-suite-inventory", slug],
    queryFn: () => fetchStorefrontProductInventory(slug),
    enabled: Boolean(slug),
    refetchInterval: STOREFRONT_POLL_INTERVAL_MS,
  });

  const { data: catalogProducts } = useQuery({
    queryKey: ["merchant-suite-products-listing"],
    queryFn: fetchStorefrontProducts,
    ...STOREFRONT_CATALOG_QUERY_OPTIONS,
    refetchInterval: STOREFRONT_POLL_INTERVAL_MS,
  });

  const generatedProduct = findGeneratedStorefrontProduct(generatedStorefrontProducts, slug);
  const productMissingFromMerchant = isFetchedAfterMount && isSuccess && merchantProduct === null;
  const product = productMissingFromMerchant
    ? null
    : mergeInventory(merchantProduct ?? cachedProduct, merchantInventory?.inventory) || generatedProduct;

  const relatedSource =
    catalogProducts && catalogProducts.length ? catalogProducts : generatedStorefrontProducts;
  const relatedProducts = relatedSource
    .filter((p) => p.slug !== product?.slug)
    .slice(0, 8);

  useEffect(() => {
    if (typeof window === "undefined" || !product?.slug) return;
    recordRecentlyViewedSlug(window.localStorage, product.slug);
  }, [product?.slug]);

  const bundles = (() => {
    const variants = product?.variants?.filter((variant) => {
      if (variant.available === false) return false;
      return typeof variant.stock_quantity !== "number" || variant.stock_quantity > 0;
    });
    if (variants?.length) {
      return variants.map((variant, i) => {
        const amount = Number.isFinite(Number(variant.price)) ? Number(variant.price) : Number(product?.price) || 0;
        return {
          id: i + 1,
          title: String(variant.attributes?.size ?? Object.values(variant.attributes ?? {})[0] ?? "Default"),
          price: `৳${amount.toLocaleString()}`,
          amount,
        };
      });
    }
    const base = Number(product?.price) || 0;
    return [{ id: 1, title: "Default", price: `৳${base.toLocaleString()}`, amount: base }];
  })();
  const bundleSignature = bundles.map((bundle) => bundle.title).join("|");
  const defaultBundleIdx = getDefaultBundleIndex(slug, bundles);
  const selectedBundle = bundles[selectedBundleIdx] ?? bundles[0];
  const selectedVariant = product?.variants?.find((variant) => {
    const label = String(variant.attributes?.size ?? Object.values(variant.attributes ?? {})[0] ?? "Default");
    return label === selectedBundle.title;
  }) || null;
  // Checkout identifies what was bought by these two ids; the Suite rejects an
  // order without them. Resolve them once so the buttons, the cart row and the
  // order payload can never disagree about whether this product is sellable.
  const canonicalProductId = product?.id != null ? String(product.id) : "";
  const canonicalVariantId = selectedVariant?.id != null ? String(selectedVariant.id) : "";
  const checkoutIdsResolved = Boolean(canonicalProductId) && Boolean(canonicalVariantId);
  const productAnalyticsItem = useMemo(() => toGoogleAnalyticsItem({
    id: selectedVariant?.id ?? product?.id ?? product?.slug ?? slug,
    name: product?.name ?? slug,
    variant: selectedBundle.title === "Default" ? null : selectedBundle.title,
    price: selectedBundle.amount,
    quantity: 1,
  }), [product?.id, product?.name, product?.slug, slug, selectedBundle.amount, selectedBundle.title, selectedVariant?.id]);
  const productImage = product?.image_url || "";
  const merchantAvailabilityKnown = isFetchedAfterMount && isSuccess && merchantProduct !== undefined;
  const merchantProductUnavailable = productMissingFromMerchant || merchantProduct?.available === false;
  const inventoryUnavailable = merchantInventory?.inventory ? !isProductOrderable(product) : false;
  const merchantUnavailable = merchantProductUnavailable || inventoryUnavailable;
  const isUnavailable = availabilityBlocked || merchantUnavailable || !checkoutIdsResolved;
  const gallery = product ? getProductGallery(product) : [];
  const displayImage = (product ? getProductImage(product) : "") || productImage;
  const displayGallery = gallery.length ? gallery : [displayImage].filter(Boolean);
  const srcSetFor = buildProductSrcSetIndex(product);
  const isLoading = !merchantAvailabilityKnown && !cachedProduct && !generatedProduct;
  const compareAtAmount = Number(product?.compare_at_price);
  const detailSections = getProductDetailSections(product);
  const [openSection, setOpenSection] = useState(0);

  const verifyOrderable = async () => {
    if (isUnavailable) {
      return false;
    }

    if (!merchantAvailabilityKnown) {
      const result = await refetch();
      const orderable = isProductOrderable(mergeInventory(result.data, merchantInventory?.inventory));
      setAvailabilityBlocked(!orderable);
      return orderable;
    }

    return true;
  };

  useEffect(() => {
    setCachedProduct(getCachedStorefrontProduct(window.localStorage, slug));
  }, [slug]);

  useEffect(() => {
    setSelectedBundleIdx(defaultBundleIdx);
    setQuantity(1);
    // `bundleSignature` changes when async catalog data arrives, but stays stable
    // while a shopper explicitly changes the selected bundle.
  }, [slug, bundleSignature, defaultBundleIdx]);

  useEffect(() => {
    const imageUrl = displayImage;
    if (!imageUrl || imageUrl.startsWith("/")) return;

    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = imageUrl;
    document.head.appendChild(link);

    return () => {
      if (document.head.contains(link)) {
        document.head.removeChild(link);
      }
    };
  }, [displayImage]);

  useEffect(() => {
    if (!isFetchedAfterMount || !isSuccess) return;

    if (merchantProduct === null) {
      removeCachedStorefrontProduct(window.localStorage, slug);
      setCachedProduct(null);
      return;
    }

    if (merchantProduct) {
      setCachedStorefrontProduct(window.localStorage, merchantProduct);
      setCachedProduct(merchantProduct);
    }
  }, [isFetchedAfterMount, isSuccess, merchantProduct, slug]);

  useEffect(() => {
    if (isLoading || !product) return;
    const googleViewKey = product.slug;
    if (viewedGoogleItemRef.current !== googleViewKey) {
      viewedGoogleItemRef.current = googleViewKey;
      trackGoogleEcommerceEvent("view_item", {
        pageType: "product",
        value: selectedBundle.amount,
        items: [productAnalyticsItem],
      });
    }

  }, [isLoading, product, productAnalyticsItem, selectedBundle.amount]);

  // SEO: per-product title/meta/OG + JSON-LD so crawlers index real mango
  // products. Unknown slugs get noindex instead of a fake Stepprs fallback.
  useEffect(() => {
    if (isLoading) return;
    const siteUrl = "https://www.serakhabar.com";
    const setMeta = (selector: string, attr: string, value: string) => {
      let el = document.head.querySelector(selector) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        if (selector.includes('property="')) {
          el.setAttribute("property", selector.split('property="')[1].split('"')[0]);
        } else if (selector.includes('name="')) {
          el.setAttribute("name", selector.split('name="')[1].split('"')[0]);
        }
        document.head.appendChild(el);
      }
      el.setAttribute(attr, value);
    };
    // Clean up previously injected product JSON-LD.
    document.head.querySelectorAll('script[data-seo="product"]').forEach((n) => n.remove());
    document.head.querySelectorAll('link[data-seo="canonical"]').forEach((n) => n.remove());
    if (!product) {
      document.title = "Product not found | সেরা খাবার - Sera Khabar";
      setMeta('meta[name="robots"]', "content", "noindex, follow");
      return;
    }
    const price = Number(selectedBundle.amount) || Number(product.price) || 0;
    const desc = (product.description || "সেরা খাবার — Sera Khabar. Fresh, authentic products delivered across Bangladesh.").slice(0, 160);
    const title = `${product.name} | সেরা খাবার - Sera Khabar`;
    const url = `${siteUrl}/product/${product.slug}`;
    document.title = title;
    setMeta('meta[name="description"]', "content", desc);
    setMeta('meta[property="og:title"]', "content", title);
    setMeta('meta[property="og:description"]', "content", desc);
    setMeta('meta[property="og:type"]', "content", "product");
    setMeta('meta[property="og:url"]', "content", url);
    if (displayImage) {
      setMeta('meta[property="og:image"]', "content", displayImage);
      setMeta('meta[name="twitter:image"]', "content", displayImage);
    }
    setMeta('meta[name="twitter:title"]', "content", title);
    setMeta('meta[name="twitter:description"]', "content", desc);
    setMeta('meta[name="robots"]', "content", "index, follow");
    const link = document.createElement("link");
    link.rel = "canonical";
    link.href = url;
    link.setAttribute("data-seo", "canonical");
    document.head.appendChild(link);
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-seo", "product");
    script.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      description: desc,
      image: displayGallery.length ? displayGallery : undefined,
      url,
      brand: { "@type": "Brand", name: "Sera Khabar" },
      offers: {
        "@type": "Offer",
        priceCurrency: "BDT",
        price: String(price),
        availability: isProductOrderable(product) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        url,
      },
    });
    document.head.appendChild(script);
  }, [isLoading, product, selectedBundle.amount, displayImage, displayGallery]);

  useEffect(() => {
    if (!galleryApi) return;

    const syncActiveImage = () => setActiveImage(galleryApi.selectedScrollSnap());

    galleryApi.scrollTo(0, true);
    syncActiveImage();
    galleryApi.on("select", syncActiveImage);
    galleryApi.on("reInit", syncActiveImage);

    return () => {
      galleryApi.off("select", syncActiveImage);
      galleryApi.off("reInit", syncActiveImage);
    };
  }, [galleryApi, displayGallery.length]);

  const goToImage = (idx: number) => {
    galleryApi?.scrollTo(idx);
  };

  const orderBundle: OrderDialogBundle | null = product ? {
        title: product.name,
        details: selectedBundle.title,
        productSlug: product.slug,
        productId: product.id !== undefined ? String(product.id) : undefined,
        price: selectedBundle.amount * quantity,
        quantity,
        unitPrice: selectedBundle.amount,
        images: [{ src: displayImage, alt: product.name }],
        analyticsItems: [{ ...productAnalyticsItem, quantity }],
        captureItems: [{
          productName: product.name,
          variantName: selectedBundle.title,
          quantity,
          unitPrice: selectedBundle.amount,
        }],
        items: checkoutIdsResolved
          ? [{ productId: canonicalProductId, variantId: canonicalVariantId, quantity }]
          : undefined,
      } : null;

  // The phone dock's contact card names what is being viewed and pre-fills the WhatsApp message.
  useDockContactProduct(product ? {
    name: splitProductName(product.name).bangla,
    whatsappName: product.name,
    size: selectedBundle.title === "Default" ? null : selectedBundle.title,
    quantity,
  } : null);

  if (isLoading) {
    return (
      <Layout>
        <ProductSkeleton />
      </Layout>
    );
  }

  if (!product || !orderBundle) {
    return (
      <Layout>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 bg-white px-6 text-center">
          <h1 className="text-2xl font-semibold text-black">Product not found</h1>
          <p className="max-w-md text-sm text-black/60">
            This product is no longer available. Browse fresh mangoes, honey, ghee and more.
          </p>
          <Link href="/products" className="rounded-[8px] bg-black px-6 py-3 text-[11px] font-bold uppercase tracking-[0.25em] text-white">
            Browse products
          </Link>
        </div>
      </Layout>
    );
  }

  const { bangla: titleBn } = splitProductName(product.name);
  const sizeOffers = getSizeOffers(bundles);
  const collection = FEATURED_COLLECTIONS.find((item) => (item.productSlugs as readonly string[]).includes(product.slug));
  const collectionBn = collection ? collection.label.split("-")[1] ?? collection.label : null;
  // The first section with a short list gives the three ✓ highlights under the title.
  const highlights = (detailSections.find((section) => section.label !== "Options" && section.details?.length)?.details ?? []).slice(0, 3);
  const memoSections = [
    ...detailSections.filter((section) => section.label !== "Options" && (section.body?.length || section.details?.length)),
    { label: "ডেলিভারি ও পেমেন্ট", body: undefined, details: DELIVERY_POINTS },
  ];
  const activeMemo = memoSections[Math.min(openSection, memoSections.length - 1)];
  const isDeliveryMemo = activeMemo === memoSections[memoSections.length - 1];
  const totalAmount = selectedBundle.amount * quantity;
  const hasMosaic = displayGallery.length > 1;
  const photoBadges = (
    <>
      {collectionBn ? <span className="skp-chip">{collectionBn}</span> : null}
      <span className="skp-seal" aria-hidden="true">
        <span>
          <b>ক্যাশ অন</b>
          <b>ডেলিভারি</b>
          <small>সারা দেশে</small>
        </span>
      </span>
    </>
  );

  return (
    <Layout>
      <div className="skp">
        <nav className="skp-crumb skp-w" aria-label="Breadcrumb">
          <Link href="/">হোম</Link>
          {collection ? (
            <>
              <span aria-hidden="true">›</span>
              <Link href={`/collection/${collection.slug}`}>{collectionBn}</Link>
            </>
          ) : null}
          <span aria-hidden="true">›</span>
          <span>{titleBn}</span>
        </nav>

        <div className="skp-top skp-w">
          <div className="skp-left">
            {/* Phones swipe one photo at a time; desktop shows every photo at once as a mosaic */}
            <div className="skp-media" data-mosaic={hasMosaic ? "" : undefined}>
            {/* Photo panel: the catalog photo's white background blends into the cream card */}
            <div className="skp-photo">
              {photoBadges}
              {displayGallery.length ? (
                <div ref={galleryRef} className="skp-gallery" data-page-settle="">
                  <div className="skp-gallery-track">
                    {displayGallery.map((url, idx) => (
                      <div key={url} className="skp-slide">
                        <img
                          src={url}
                          srcSet={srcSetFor[url]}
                          sizes={srcSetFor[url] ? "(min-width: 760px) 560px, 92vw" : undefined}
                          alt={idx === 0 ? product.name : `${product.name} ${idx + 1}`}
                          width={1080}
                          height={1080}
                          draggable={false}
                          loading={idx === 0 ? "eager" : "lazy"}
                          fetchPriority={idx === 0 ? "high" : undefined}
                          decoding="async"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="skp-noimg">No image</div>
              )}
              {displayGallery.length > 1 ? (
                <div className="skp-capsule">
                  {displayGallery.map((url, idx) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => goToImage(idx)}
                      aria-label={`ছবি ${toBanglaDigits(idx + 1)}`}
                      aria-current={activeImage === idx}
                    >
                      <img
                        src={url}
                        srcSet={srcSetFor[url]}
                        sizes={srcSetFor[url] ? "38px" : undefined}
                        alt=""
                        width={38}
                        height={38}
                        draggable={false}
                        loading="lazy"
                        decoding="async"
                      />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            {hasMosaic ? (
              <ProductMosaic images={displayGallery} srcSetFor={srcSetFor} name={product.name} badges={photoBadges} />
            ) : null}
            </div>

            {/* Details: homepage shelf chips switch one footer-style cash memo */}
            <section className="skp-details" aria-label="বিস্তারিত" data-reveal="">
              <div className="skp-dh">
                <h2>বিস্তারিত</h2>
                <span className="script">জেনে নিন</span>
              </div>
              <div className="skp-chips" role="tablist" aria-label="বিস্তারিত">
                {memoSections.map((section, i) => (
                  <button
                    key={section.label}
                    type="button"
                    role="tab"
                    aria-selected={activeMemo === section}
                    onClick={() => setOpenSection(i)}
                    className="press"
                  >
                    {section.label}
                  </button>
                ))}
              </div>
              <div className="skp-memo-w" key={activeMemo.label} role="tabpanel">
                <span className="tack" />
                <div className={isDeliveryMemo ? "skp-memo has-stamp" : "skp-memo"}>
                  <div className="skp-memo-top">
                    <img src="/home/leaf-mark.webp" alt="" />
                    <div className="skp-memo-title">
                      <b>{activeMemo.label}</b>
                      <span>{titleBn}</span>
                    </div>
                    <div className="skp-memo-no">
                      নং <span className="num">{toBanglaDigits(String(memoSections.indexOf(activeMemo) + 1).padStart(2, "0"))}</span>
                      <br />
                      মোট {toBanglaDigits(String(memoSections.length).padStart(2, "0"))}
                    </div>
                  </div>
                  {activeMemo.body?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                  {activeMemo.details?.length ? (
                    <>
                      <div className="skp-memo-h">{isDeliveryMemo ? "জেনে রাখুন" : "যা থাকছে"}</div>
                      {activeMemo.details.map((detail) => (
                        <div key={detail} className="skp-memo-row">
                          <span>{detail}</span>
                          <em>✓</em>
                        </div>
                      ))}
                    </>
                  ) : null}
                  {isDeliveryMemo ? (
                    <div className="stampc" aria-hidden="true">
                      ক্যাশ অন
                      <br />
                      ডেলিভারি
                      <br />· সারা দেশে ·
                    </div>
                  ) : null}
                </div>
              </div>
            </section>
          </div>

          <div className="skp-info">
            <h1 data-load-step="">{titleBn}</h1>
            {highlights.length ? (
              <ul className="skp-ticks">
                {highlights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}

            <div className="skp-price" data-load-step="">
              <span className="num">৳{toBanglaDigits(totalAmount.toLocaleString("en-IN"))}</span>
              {quantity > 1 ? <small>প্রতি প্যাক {formatTaka(selectedBundle.amount)}</small> : null}
              {Number.isFinite(compareAtAmount) && compareAtAmount > selectedBundle.amount ? (
                <s>{formatTaka(compareAtAmount)}</s>
              ) : null}
            </div>

            {selectedBundle.title !== "Default" ? (
              <div>
                <span className="skp-lbl">{bundles.length > 1 ? "পরিমাণ বেছে নিন" : "পরিমাণ"}</span>
                <div className="skp-sizes" data-count={bundles.length}>
                  {bundles.map((bundle, idx) => (
                    <button
                      key={bundle.id}
                      type="button"
                      onClick={() => setSelectedBundleIdx(idx)}
                      aria-pressed={selectedBundleIdx === idx}
                      className="skp-size press"
                    >
                      {sizeOffers[idx]?.saving ? (
                        <span className="skp-badge">
                          <span>{formatTaka(sizeOffers[idx].saving)}</span>
                          <span>সাশ্রয়</span>
                        </span>
                      ) : null}
                      {displayImage ? (
                        <img
                          src={displayImage}
                          srcSet={srcSetFor[displayImage]}
                          sizes={srcSetFor[displayImage] ? "44px" : undefined}
                          alt=""
                          loading="lazy"
                          decoding="async"
                        />
                      ) : null}
                      <span>
                        <b>{bundle.title}</b>
                        <span className="num">{formatTaka(bundle.amount)}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {isUnavailable ? <div className="skp-unavailable">এই মুহূর্তে পাওয়া যাচ্ছে না</div> : null}

            <div className="skp-buyrow">
              <div className="skp-qty" role="group" aria-label="পরিমাণ">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  disabled={quantity === 1}
                  onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                >
                  <Minus className="h-4 w-4" aria-hidden="true" />
                </button>
                <output aria-live="polite" className="num">{toBanglaDigits(quantity)}</output>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  disabled={quantity >= MAX_LINE_QUANTITY}
                  onClick={() => setQuantity((current) => Math.min(MAX_LINE_QUANTITY, current + 1))}
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <button
                type="button"
                disabled={isUnavailable || selectedBundle.amount <= 0}
                onClick={() => {
                  // Checkout opens on the tap; if the stock check fails, it closes and the page shows why.
                  setOrderOpen(true);
                  void verifyOrderable().then((orderable) => {
                    if (!orderable) setOrderOpen(false);
                  });
                }}
                className="skp-cod press"
                aria-label="ক্যাশ অন ডেলিভারিতে অর্ডার করুন"
              >
                অর্ডার করুন
                <i aria-hidden="true" />
              </button>
            </div>
            <button
              type="button"
              disabled={isUnavailable || selectedBundle.amount <= 0}
              onClick={async () => {
                if (!(await verifyOrderable())) {
                  return;
                }
                addToCart(
                  {
                    id: getProductNumericId(product),
                    title: `${product.name} (${selectedBundle.title})`,
                    price: selectedBundle.price,
                    image: displayImage,
                    analyticsItem: productAnalyticsItem,
                    productUuid: canonicalProductId,
                    variantId: canonicalVariantId,
                  },
                  selectedBundle.title,
                  quantity,
                );
              }}
              className="skp-cart press"
            >
              কার্টে রাখুন
            </button>

            <div className="skp-or">অথবা</div>
            <div className="skp-help">
              <a href="tel:+8801310980289" className="skp-call press">
                {/* Material Design Icons by Pictogrammers — https://github.com/Templarian/MaterialDesign/blob/master/LICENSE */}
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="24" viewBox="7 1 11 22" aria-hidden="true" focusable="false" className="shrink-0">
                  <path fill="#ffffff" d="M15 2a1 1 0 0 0-1 1v3h-4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h5c1.11 0 2-.89 2-2V8c0-.74-.4-1.38-1-1.72V3a1 1 0 0 0-1-1m-5 6h5v5h-5zm0 7h1v1h-1zm2 0h1v1h-1zm2 0h1v1h-1zm-4 2h1v1h-1zm2 0h1v1h-1zm2 0h1v1h-1zm-4 2h1v1h-1zm2 0h1v1h-1zm2 0h1v1h-1z" />
                </svg>
                ফোনে অর্ডার
              </a>
              <a
                href={`https://wa.me/8801303103540?text=${encodeURIComponent(
                  `Hello, I'd like to order: ${product.name} (${selectedBundle.title})`,
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="skp-wa press"
              >
                <img src="https://cdn.reicon.dev/logos/whatsapp/original.svg" alt="" width={18} height={18} />
                হোয়াটসঅ্যাপে অর্ডার
              </a>
            </div>
          </div>
        </div>

        <div className="skp-strip" aria-hidden="true">
          <div>
            {[0, 1].map((copy) =>
              STRIP_ITEMS.map((item) => <span key={`${copy}-${item}`}>{item}</span>),
            )}
          </div>
        </div>

        {/* Reels Section — card row, title and round arrows in one header row */}
        {reelCount > 0 && (
          <section className="skp-reels skp-w" data-reveal="">
            <div className="skp-reels-head">
              <h2>
                আমরা ও আমাদের <span className="script">সত্যতা</span>
              </h2>
              <div className="skp-reels-nav">
                <button type="button" aria-label="Previous reel" onClick={() => goReel(-1)} className="skp-round press">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button type="button" aria-label="Next reel" onClick={() => goReel(1)} className="skp-round press">
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div ref={reelRef} className="relative overflow-hidden [touch-action:pan-y_pinch-zoom] overscroll-x-contain">
              <div className="flex will-change-transform">
                {reelMedia.map(({ src, poster }, i) => (
                  <div
                    key={src}
                    className={`mr-5 min-w-0 shrink-0 basis-[64vw] rounded-[10px] border-2 p-[3px] transition-colors duration-200 md:basis-[220px] ${i === currentReel ? "border-[#FBBB14]" : "border-transparent"}`}
                  >
                    <div className="relative aspect-[9/16] w-full overflow-hidden rounded-[6px] bg-black">
                      {i === playerReel ? (
                        <VideoPlayer poster={poster}>
                          <VideoSkin className="absolute inset-0 h-full w-full" style={REEL_SKIN_STYLE}>
                            <Video
                              src={src}
                              title={`Sera Khabar reel ${i + 1}`}
                              playsInline
                              preload="metadata"
                              ref={(video) => {
                                activeReelVideoRef.current = video;
                              }}
                            />
                            {/* The packaged skin maps a touch tap to showing controls; reels want
                                tap-to-pause/play on phones too. Registered before the skin's own
                                gestures, so this one wins. */}
                            <Gesture type="tap" action="togglePaused" pointer="touch" />
                            <PlayButton
                              render={(props, state) => (
                                <button
                                  {...props}
                                  hidden={!state.paused}
                                  className="absolute left-1/2 top-1/2 z-20 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                                >
                                  <Play className="ml-1 h-7 w-7 fill-current" />
                                </button>
                              )}
                            />
                          </VideoSkin>
                        </VideoPlayer>
                      ) : (
                        <>
                          <img
                            src={poster}
                            alt=""
                            aria-hidden="true"
                            loading="lazy"
                            decoding="async"
                            className="pointer-events-none absolute inset-0 z-10 h-full w-full object-cover"
                          />
                          {showPreviews ? (
                            <>
                              {/* Muted + playsInline lets phones start it without a tap. */}
                              <video
                                ref={(video) => {
                                  previewVideoRefs.current[i] = video;
                                }}
                                src={src}
                                poster={poster}
                                muted
                                autoPlay
                                loop
                                playsInline
                                preload="auto"
                                disablePictureInPicture
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-0 z-10 h-full w-full object-cover"
                              />
                              <button
                                type="button"
                                aria-label={i === currentReel ? `Play reel ${i + 1} with sound` : `Show reel ${i + 1}`}
                                onClick={() =>
                                  i === currentReel
                                    ? startReel(i, previewVideoRefs.current[i]?.currentTime ?? 0)
                                    : reelApi?.scrollTo(i)
                                }
                                className="absolute inset-0 z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/80"
                              >
                                <span className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white">
                                  <VolumeX className="h-4 w-4" />
                                </span>
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              aria-label={i === currentReel ? `Play reel ${i + 1}` : `Show reel ${i + 1}`}
                              onClick={() => (i === currentReel ? startReel(i) : reelApi?.scrollTo(i))}
                              className="absolute left-1/2 top-1/2 z-20 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                            >
                              <Play className="ml-1 h-7 w-7 fill-current" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>

      {/* আরও দেখুন: the homepage's Stage product cells */}
      <section className="st">
        <div className="st-frame">
          <div className="st-row st-head">
            <div className="st-cell">
              <h2 className="display">
                আরও <b>দেখুন</b>
              </h2>
            </div>
            <div className="st-cell">
              <span className="st-lab">যা খুঁজছেন</span>
            </div>
          </div>
          <div className="st-row st-grid">
            {relatedProducts.map((p) => (
              <PosterProductCard key={p.slug} product={p} look="stage" />
            ))}
          </div>
        </div>
      </section>

      <RecentlyViewed products={relatedSource} excludeSlug={product?.slug} look="stage" />

      <OrderDialog open={orderOpen} onOpenChange={setOrderOpen} bundle={orderBundle} onQuantityChange={setQuantity} />
    </Layout>
  );
}
