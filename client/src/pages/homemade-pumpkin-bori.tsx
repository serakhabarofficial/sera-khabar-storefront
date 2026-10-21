import { useCallback, useEffect, useState, type MouseEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import useEmblaCarousel from "embla-carousel-react";
import { motion } from "framer-motion";
import { Phone } from "lucide-react";
import { TextHighlighter } from "@/components/ui/text-highlighter";
import { ShiningText } from "@/components/ui/shining-text";

import brandLogo from "@assets/sera-khabar-logo.webp";
import { WhatsAppBrandIcon } from "@/features/landing/campaign-layout";
import { LANDING_PHONE_HREF } from "@/features/landing/content";
import { BORI_CAMPAIGN_WHATSAPP_HREF, BORI_HERO_FALLBACK_IMAGE, BORI_PACK_2KG_IMAGE, BORI_PACK_500G_IMAGE, BORI_QUOTE_IMAGE, BORI_STRIP_IMAGE } from "@/features/landing/bori-content";
import { LandingCheckout } from "@/features/landing/landing-checkout";
import { WhatsAppSwitch } from "@/features/landing/whatsapp-switch";
import { BoriCookingPath } from "@/features/landing/bori-cooking-path";
import { MobileOrderBar } from "@/features/landing/mobile-order-bar";
import { resolveLandingCheckoutStatus } from "@/features/landing/checkout-state";
import { getLandingPackOptions } from "@/features/landing/order";
import { generatedStorefrontProducts } from "@/lib/generated-storefront-products";
import { STOREFRONT_POLL_INTERVAL_MS, fetchStorefrontProduct, fetchStorefrontProductInventory, findGeneratedStorefrontProduct, getProductGallery, mergeInventory } from "@/lib/storefront-products";
import "@/features/landing/campaign.css";

const BENEFIT_BADGE = "relative flex size-9 shrink-0 rotate-[-6deg] items-center justify-center rounded-[47%_53%_51%_49%] border-2 border-[#b98500] text-sm font-bold text-[#b98500] after:absolute after:inset-[-3px] after:rotate-[13deg] after:rounded-[53%_47%_49%_51%] after:border after:border-[#b98500]/60 after:content-['']";
const BADGE_NUMERALS = ["১", "২", "৩", "৪"];

const PACKS = [
  { size: "1KG", price: "৳700", comparePrice: "৳1,300", image: BORI_PACK_500G_IMAGE, imageAlt: "১ কেজি কুমড়ো বড়ির প্যাকেজ", borderClass: "border-black/15", benefits: ["ছোট পরিবারের জন্য উপযুক্ত", "প্রথমবার স্বাদ নিতে আদর্শ", "হাতে তৈরি ও রোদে শুকানো", "পরিচ্ছন্ন প্যাকেজিং"], bleedRight: false },
  { size: "2KG", price: "৳1,400", comparePrice: "৳2,600", image: BORI_PACK_2KG_IMAGE, imageAlt: "২ কেজি কুমড়ো বড়ির প্যাকেজ", borderClass: "border-[#b98500]/45", benefits: ["বেশি পরিমাণে, বেশি সাশ্রয়ী", "মাসজুড়ে রান্নার জন্য", "মাষকলাই ডাল ও চালকুমড়োর বড়ি", "বড় পরিবার বা উপহারের জন্য পারফেক্ট"], bleedRight: true },
];

const COOKING_STEPS = [
  { title: "হালকা ভেজে নিন", body: "অল্প তেলে বড়িগুলো হালকা সোনালি করে ভেজে নিন।", image: "/bori-cook-step-1.webp", imageAlt: "অল্প তেলে কুমড়ো বড়ি ভাজা হচ্ছে" },
  { title: "তরকারিতে দিন", body: "রান্না শেষ হওয়ার ৫–৭ মিনিট আগে ভাজা বড়ি মাছ বা সবজির ঝোলে দিন।", image: "/bori-cook-step-2.webp", imageAlt: "মাছের তরকারিতে ভাজা কুমড়ো বড়ি দেওয়া হচ্ছে" },
  { title: "গরম গরম পরিবেশন করুন", body: "ভাতের সঙ্গে উপভোগ করুন ঘরোয়া স্বাদের বড়ির তরকারি।", image: "/bori-cook-step-3.webp", imageAlt: "কুমড়ো বড়ি দিয়ে রান্না করা মাছের তরকারি" },
];

export default function HomemadePumpkinBoriPage() {
  const slug = "homemade-pumpkin-bori";
  const generatedProduct = findGeneratedStorefrontProduct(generatedStorefrontProducts, slug);
  const productQuery = useQuery({ queryKey: ["merchant-suite-product", slug], queryFn: () => fetchStorefrontProduct(slug), initialData: generatedProduct ?? undefined, refetchInterval: STOREFRONT_POLL_INTERVAL_MS });
  const inventoryQuery = useQuery({ queryKey: ["merchant-suite-inventory", slug], queryFn: () => fetchStorefrontProductInventory(slug), refetchInterval: STOREFRONT_POLL_INTERVAL_MS });
  const [activeImage, setActiveImage] = useState(0);
  const [galleryRef, galleryApi] = useEmblaCarousel({ align: "start", loop: false });
  const product = mergeInventory(productQuery.data, inventoryQuery.data?.inventory);
  const gallery = product ? getProductGallery(product) : [];
  const displayGallery = gallery.length ? gallery : [BORI_HERO_FALLBACK_IMAGE];
  useEffect(() => {
    if (!galleryApi) return;
    const syncActiveImage = () => setActiveImage(galleryApi.selectedScrollSnap());
    galleryApi.on("select", syncActiveImage);
    return () => {
      galleryApi.off("select", syncActiveImage);
    };
  }, [galleryApi]);
  const status = resolveLandingCheckoutStatus({ hasProduct: Boolean(product), hasOrderablePacks: product ? getLandingPackOptions(product).length > 0 : false, productIsPending: productQuery.isPending, productIsError: productQuery.isError, inventoryIsError: inventoryQuery.isError, inventoryIsFetched: inventoryQuery.isFetched, hasInventory: Boolean(inventoryQuery.data?.inventory) });
  const scrollToOrder = useCallback(() => {
    const target = document.getElementById("order");
    const heading = document.getElementById("landing-checkout-heading");
    if (!target) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    window.setTimeout(() => heading?.focus({ preventScroll: true }), reduceMotion ? 0 : 450);
  }, []);
  const handleOrderClick = useCallback((event: MouseEvent<HTMLAnchorElement>) => {
    if (event.currentTarget.className.includes("border-[#25d366]")) {
      event.preventDefault();
      window.open(BORI_CAMPAIGN_WHATSAPP_HREF, "_blank", "noopener,noreferrer");
      return;
    }
    event.preventDefault();
    scrollToOrder();
  }, [scrollToOrder]);

  if (productQuery.isPending) return <div className="flex min-h-screen items-center justify-center bg-white" aria-busy="true"><span className="sr-only">পণ্য লোড হচ্ছে…</span><span aria-hidden="true" className="size-8 animate-pulse rounded-full bg-[#eab308]/50" /></div>;
  if (!product) return <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-6 text-center"><h1 className="text-2xl font-bold">পণ্যটি পাওয়া যায়নি</h1><Link href="/products" className="rounded-full bg-black px-5 py-3 text-sm text-white">সব পণ্য দেখুন</Link></div>;

  return <motion.div className="min-h-screen w-full max-w-full overflow-x-hidden bg-white text-[#19382d]" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1] }}>
    <header className="sticky top-0 z-40 border-b border-black/[0.06] bg-white/95 backdrop-blur"><div className="relative mx-auto flex h-[60px] max-w-6xl items-center justify-between px-4 sm:px-6 md:h-[76px]"><p className="hidden text-sm text-[#19382d]/55 md:block"><span className="font-bold text-[#19382d]">ক্যাশ অন ডেলিভারি</span><span aria-hidden="true" className="mx-3 inline-block size-1 rounded-full bg-[#b98500] align-middle" />সারা বাংলাদেশে</p><Link href="/step/homemade-pumpkin-bori" aria-label="সেরা খাবার কুমড়ো বড়ি পেজ" className="flex items-center md:absolute md:left-1/2 md:-translate-x-1/2"><img src={brandLogo} alt="সেরা খাবার" className="h-7 w-auto max-[400px]:h-6 max-[340px]:h-5 md:h-9" decoding="async" /></Link><nav aria-label="যোগাযোগ" className="ml-auto flex items-center gap-2.5 md:gap-3.5"><WhatsAppSwitch href={BORI_CAMPAIGN_WHATSAPP_HREF} label="WhatsApp-এ অর্ডার করুন" /><button type="button" onClick={scrollToOrder} className="inline-flex min-h-10 items-center rounded-[6px] bg-[#eab308] px-4 text-[13px] max-[400px]:px-3 max-[400px]:text-xs font-extrabold text-[#19382d] transition-colors hover:bg-[#d59f00] md:min-h-11 md:px-6 md:text-[15px]">অর্ডার করুন</button></nav></div></header>
    <main className="w-full max-w-full overflow-x-hidden">
      <section className="mx-auto grid max-w-6xl gap-8 px-0 pb-16 pt-0 md:grid-cols-2 md:items-center md:px-5 md:pt-16">
        <div className="order-2 px-5 text-center md:order-1 md:px-0 md:text-left">
          <p className="text-sm font-bold tracking-[0.2em] text-[#b98500]">ঐতিহ্যবাহী ঘরোয়া স্বাদ</p>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight md:text-6xl">
            <span className="font-black">ঘরে তৈরি, রোদে শুকানো</span>
            <br />
            <button type="button" className="katimon-hero-button" onClick={scrollToOrder} aria-label="কুমড়ো বড়ি অর্ডার করুন">
              <span className="katimon-hero-button__shadow" aria-hidden="true" />
              <span className="katimon-hero-button__edge" aria-hidden="true" />
              <span className="katimon-hero-button__front !pb-[0.3em] !pt-[0.1em]"><ShiningText text="কুমড়ো বড়ি" className="-my-[0.3em] inline-block py-[0.3em] font-extrabold" /></span>
            </button>
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-[#19382d]/70">বাছাই করা মাষকলাইয়ের ডাল ও টাটকা চালকুমড়োয় হাতে তৈরি—মাছ, শাক আর তরকারিতে পরিচিত বাঙালি স্বাদ।</p>
          <div className="mt-8 flex flex-nowrap justify-center gap-2 md:justify-start"><a href="#order" onClick={handleOrderClick} className="inline-flex min-w-0 flex-1 items-center justify-center whitespace-nowrap rounded-[4px] bg-[#eab308] px-2 py-3 text-[14px] font-extrabold text-[#19382d] sm:px-5 sm:py-4 sm:text-base">এখনই অর্ডার করুন</a><a href="#order" onClick={handleOrderClick} className="inline-flex min-w-0 flex-1 items-center justify-center gap-1 rounded-[4px] border border-[#25d366]/50 bg-[#f4fff7] px-2 py-3 text-[14px] font-bold text-[#168a45] transition-colors hover:bg-[#25d366] hover:text-white sm:gap-2 sm:px-5 sm:py-4 sm:text-base"><WhatsAppBrandIcon className="size-5" />এখনই অর্ডার করুন</a></div>
        </div>
        <div className="order-1 bg-white p-[10px] shadow-sm md:order-2 md:rounded-[8px] md:p-4"><div className="relative mx-auto aspect-square w-full max-w-[1080px] overflow-hidden rounded-[8px] bg-white"><div ref={galleryRef} className="h-full cursor-grab overflow-hidden active:cursor-grabbing"><div className="flex h-full touch-pan-y">{displayGallery.map((url) => <div key={url} className="relative h-full min-w-0 flex-[0_0_100%] overflow-hidden"><img src={url} alt={product.name} draggable={false} className="absolute inset-0 h-full w-full select-none object-cover object-center" /></div>)}</div></div>{displayGallery.length > 1 && <div className="absolute left-3 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-2">{displayGallery.map((url, idx) => <button key={url} type="button" onClick={() => galleryApi?.scrollTo(idx)} aria-label={`কুমড়ো বড়ির ছবি ${idx + 1}`} className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-[6px] border-2 bg-white shadow-md transition-all ${activeImage === idx ? "border-black opacity-100" : "border-white/70 opacity-70 hover:opacity-100"}`}><img src={url} alt={`${product.name} ${idx + 1}`} className="h-full w-full object-cover object-center" /></button>)}</div>}</div></div>
      </section>
      <section aria-labelledby="bori-packages" className="mx-auto max-w-6xl min-w-0 overflow-hidden px-3 pb-12 sm:px-5 md:overflow-visible md:pb-16">
        <div className="mb-5 px-2 text-center md:mb-7 md:px-0"><p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#b98500]">বিশেষ প্যাকেজ</p><h2 id="bori-packages" className="mt-2 text-xl font-bold leading-tight text-[#19382d] md:mt-3 md:text-3xl">আপনার পছন্দের প্যাক বেছে নিন</h2></div>
        <div className="grid gap-4 md:grid-cols-2">
          {PACKS.map((pack) => <article key={pack.size} className={`relative flex min-w-0 min-h-[360px] flex-col overflow-hidden rounded-[4px] border ${pack.borderClass} bg-white p-6 md:p-8`}><div className="min-w-0 md:pr-[44%]"><div className={`-mx-6 -mt-6 mb-5 flex h-60 items-center ${pack.bleedRight ? "justify-end pl-4 pr-0" : "justify-center px-4"} bg-gradient-to-b from-[#fff6d6] via-[#fffbea] to-white pt-5 md:absolute ${pack.bleedRight ? "md:right-0" : "md:right-6"} md:top-8 md:m-0 md:h-64 md:w-[50%] md:bg-none md:p-0`}><img src={pack.image} alt={pack.imageAlt} className={`h-full w-full object-contain${pack.bleedRight ? " object-right" : ""} mix-blend-multiply`} /></div><p className="text-[10px] font-bold uppercase tracking-[0.28em] text-black/45">কুমড়ো বড়ি</p><h3 className="mt-3 text-3xl font-bold text-[#19382d]">{pack.size}</h3><div className="mt-2 flex items-baseline gap-3"><span className="rounded-[3px] bg-[#fff0a8] px-1 text-3xl font-extrabold text-[#b98500]">{pack.price}</span><span className="text-base font-semibold text-black/45 line-through decoration-[#b98500] decoration-2">{pack.comparePrice}</span></div><ul className="mt-6 min-w-0 space-y-2 text-sm leading-6 text-[#19382d]">{pack.benefits.map((benefit, idx) => <li key={benefit} className="flex min-w-0 items-center gap-3 py-1 font-medium"><span className={BENEFIT_BADGE} aria-hidden="true">{BADGE_NUMERALS[idx]}</span><span>{benefit}</span></li>)}</ul></div><div className="mt-auto pt-8"><a href="#order" onClick={handleOrderClick} className="inline-flex w-full items-center justify-center rounded-[4px] bg-[#eab308] px-5 py-3 text-sm font-bold text-[#19382d] transition-colors hover:bg-[#d59f00]">অর্ডার করুন</a></div></article>)}
        </div>
      </section>
      <section className="mx-auto max-w-4xl px-5 pb-8 text-center md:max-w-6xl"><div className="mx-auto max-w-3xl text-lg leading-[1.85] text-[#19382d]/75 md:text-xl"><p><TextHighlighter>ঘরোয়া পদ্ধতিতে তৈরি</TextHighlighter> কুমড়ো বড়ি—<TextHighlighter>বাছাই করা মাষকলাইয়ের ডাল</TextHighlighter> আর <TextHighlighter>টাটকা চালকুমড়ো</TextHighlighter> মিশিয়ে অভিজ্ঞ কারিগরদের হাতে বড়ি দেওয়া হয়, তারপর পরিষ্কার-পরিচ্ছন্নভাবে <TextHighlighter>রোদে শুকানো</TextHighlighter> হয়। মাছ, শাক কিংবা সবজির তরকারিতে যোগ করলেই ফিরে আসে <TextHighlighter>ঐতিহ্যবাহী বাঙালি স্বাদ</TextHighlighter>।</p></div><div className="-mx-[10px] mt-6 md:relative md:mx-0 md:aspect-[16/9] md:overflow-hidden md:rounded-[8px]"><img src={BORI_STRIP_IMAGE} alt="" aria-hidden="true" className="hidden md:absolute md:inset-0 md:block md:size-full md:scale-110 md:object-cover md:blur-2xl" /><img src={BORI_STRIP_IMAGE} alt="ঐতিহ্য, গুণ ও স্বাদের কুমড়ো বড়ি" className="mx-auto h-auto w-full max-w-xl rounded-[8px] object-contain md:relative md:h-full md:w-auto md:max-w-full" /></div><section aria-labelledby="bori-nutritionist-heading" className="-mx-[10px] mt-8 overflow-hidden rounded-[4px] border border-black/15 bg-white text-left md:mx-0"><div className="grid md:grid-cols-[0.82fr_1.18fr]"><div className="aspect-square min-h-0 bg-contain bg-bottom bg-no-repeat md:aspect-auto md:min-h-full md:bg-left-bottom" style={{ backgroundImage: `url(${BORI_QUOTE_IMAGE})` }} /><div className="relative bg-white px-6 py-8 text-[#19382d] sm:px-10 sm:py-10"><span aria-hidden="true" className="absolute right-6 top-0 font-serif text-[7rem] leading-none text-[#b98500]/20">“</span><p className="relative text-xs font-bold uppercase tracking-[0.18em] text-[#b98500]">দায়িত্বশীল তথ্য</p><h2 id="bori-nutritionist-heading" className="relative mt-3 text-2xl font-bold leading-tight text-[#19382d] sm:text-3xl">কুমড়ো বড়ি নিয়ে পুষ্টিবিদের কথা</h2><blockquote className="relative mt-5 border-l-2 border-[#b98500] pl-4 text-base leading-8 text-black/65 sm:text-lg"><span className="md:hidden">একজন পুষ্টিবিদ হিসেবে বলি—খাবার যত ঘরোয়া, ততই ভরসার। আমাদের কুমড়ো বড়ি তৈরি হয় শুধু বাছাই করা মাষকলাইয়ের ডাল আর টাটকা চালকুমড়ো দিয়ে, রোদে শুকিয়ে। পরিমিত পরিমাণে প্রতিদিনের রান্নায় রাখুন।</span><span className="hidden md:inline">একজন পুষ্টিবিদ হিসেবে আমি সবসময় বলি—খাবার যত ঘরোয়া ও সহজ উপকরণে তৈরি, ততই তা আমাদের জন্য ভরসার। আমাদের কুমড়ো বড়ি তৈরি হয় শুধু বাছাই করা মাষকলাইয়ের ডাল আর টাটকা চালকুমড়ো দিয়ে, রোদে শুকিয়ে। ডালের প্রাকৃতিক গুণ আর ঐতিহ্যবাহী স্বাদ—দুটোই থাকে প্রতিটি বড়িতে। পরিমিত পরিমাণে প্রতিদিনের রান্নায় রাখুন, পরিবারের সবাই মিলে উপভোগ করুন।</span></blockquote><p className="relative mt-5 font-semibold text-[#b98500]">— পুষ্টিবিদ মুরাদ পারভেজ</p></div></div></section></section>
      <section aria-labelledby="bori-cooking-heading" className="mx-auto max-w-5xl px-5 pb-0 pt-4 md:pt-8 lg:pb-20">
        <div className="mb-6 text-center md:mb-12"><p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#b98500]">যেভাবে রান্না করবেন</p><h2 id="bori-cooking-heading" className="mt-2 text-xl font-bold leading-tight text-[#19382d] md:mt-3 md:text-3xl">রান্নার সহজ ধাপগুলো</h2></div>
        <BoriCookingPath steps={COOKING_STEPS} />
      </section>
      <section id="order" className="mx-auto max-w-4xl scroll-mt-24 px-[10px] pb-20 md:px-5 lg:max-w-6xl"><LandingCheckout product={product} status={status} productQuery={productQuery} inventoryQuery={inventoryQuery} thankYouPath="/step/homemade-pumpkin-bori/thank-you" whatsappHref={BORI_CAMPAIGN_WHATSAPP_HREF} deliveryCharge={100} onRetry={() => void Promise.all([productQuery.refetch(), inventoryQuery.refetch()])} /></section>
    </main>
    <footer className="relative overflow-hidden border-t border-black/10 bg-white text-black/70"><div className="absolute inset-0 hidden bg-cover bg-center bg-no-repeat opacity-25 md:block" style={{ backgroundImage: "url('/footer-bg.webp')" }} /><div className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20 md:hidden" style={{ backgroundImage: "url('/footer-bg-mobile-v2.webp')" }} /><div className="absolute inset-0 bg-white/75" /><div className="relative z-10 mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12"><div className="grid gap-7 md:grid-cols-[1.1fr_0.9fr_0.9fr]"><div><img src={brandLogo} alt="সেরা খাবার" className="h-9 w-auto" /><p className="mt-3 max-w-sm text-sm leading-6 text-black/60">প্রকৃতির স্বাদ, যত্নের সঙ্গে পৌঁছে দিই আপনার ঘরে।</p><div className="mt-4 flex items-center gap-4 text-[10px] font-bold uppercase tracking-[0.2em] text-black/45"><span className="tracking-normal">ক্যাশ অন ডেলিভারি</span><span>·</span><span className="tracking-normal">সারা বাংলাদেশে</span></div></div><div><p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#b98500]">যোগাযোগ</p><div className="mt-3 flex flex-row gap-2"><a href={LANDING_PHONE_HREF} className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-[4px] border border-black/15 bg-white px-2 py-2 text-sm transition-colors hover:bg-black hover:text-white md:w-auto"><Phone className="size-4" />কল করুন</a><a href={BORI_CAMPAIGN_WHATSAPP_HREF} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-[4px] border border-[#25d366]/50 bg-[#f4fff7] px-2 py-2 text-sm text-[#168a45] transition-colors hover:bg-[#25d366] hover:text-white md:w-auto"><WhatsAppBrandIcon className="size-4" />হোয়াটসঅ্যাপ করুন</a></div></div><div><p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#b98500]">সেরা খাবার</p><p className="mt-3 text-sm leading-6 text-black/60">পুষ্টিবিদ মুরাদ পারভেজ পরিচালিত একটি ই-কমার্স প্ল্যাটফর্ম, যার লক্ষ্য প্রতিটি ঘরে ভেজালমুক্ত ও নিরাপদ খাবার পৌঁছে দেয়া।</p></div></div><div className="mt-7 flex flex-col items-center gap-3 border-t border-black/10 pt-5 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-black/45 md:flex-row md:justify-center"><div><p>© ২০২৬ সেরা খাবার · <a href="https://www.bing.com/maps/default.aspx?v=2&pc=FACEBK&mid=8100&where1=Nowhata%2C%20Paba%2C%20Rajshahi%2C%20Bangladesh%2C%206213&FORM=FBKPL1&mkt=en-GB" target="_blank" rel="noopener noreferrer" className="hover:text-black">নওহাটা, পবা, রাজশাহী, বাংলাদেশ, ৬২১৩</a></p><a href="https://www.arc-bangladesh.com/" target="_blank" rel="noopener noreferrer" className="group mt-3 inline-flex items-center gap-3"><span className="-mr-[0.28em] text-[8px] font-medium uppercase tracking-[0.28em] text-black/55">Designed &amp; Engineered by</span><span aria-hidden="true" className="h-4 w-px shrink-0 bg-black/20" /><img src="/arc-credit.webp" alt="Arc Labs Corporation" width={188} height={72} className="h-[22px] w-auto transition-transform duration-300 group-hover:scale-105" loading="lazy" decoding="async" /></a></div><nav aria-label="নীতিমালা" className="flex flex-nowrap justify-center gap-x-3 whitespace-nowrap text-[9px] md:gap-x-4 md:text-[10px]"><Link href="/privacy-policy">• Privacy Policy</Link><Link href="/refund-and-return-policy">• Refund &amp; Return</Link><Link href="/terms-and-conditions">• Terms &amp; Conditions</Link></nav></div></div><div className="relative z-10 h-1 bg-[#FBBB14]" /></footer>
    <MobileOrderBar checkoutId="order" whatsappHref={BORI_CAMPAIGN_WHATSAPP_HREF} onOrderClick={() => scrollToOrder()} />
  </motion.div>;
}
