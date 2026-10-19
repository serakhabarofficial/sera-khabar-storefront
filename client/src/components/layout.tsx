import { Link, useLocation } from "wouter";
import { ArrowUpRight, ShieldCheck, X } from "lucide-react";
import { useId, useState, type CSSProperties, type FormEvent, type MouseEvent } from "react";
import { useQuery } from "@tanstack/react-query";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useCart } from "@/contexts/cart-context";
import CartDrawer from "@/components/cart-drawer";
import CartAddedToast from "@/components/cart-added-toast";
import { DockContactCard, DockContactSeal } from "@/components/dock-contact";
import { PageContentTransition } from "@/components/page-transition";
import { Drawer } from "vaul";
import { useIsMobile } from "@/hooks/use-mobile";
import headerLogo from "@assets/sera-khabar-leaf-logo.webp";
import {
  fetchStorefrontProducts,
  getProductImageSet,
  searchStorefrontProducts,
  STOREFRONT_CATALOG_QUERY_OPTIONS,
  type StorefrontProduct,
} from "@/lib/storefront-products";
import { generatedStorefrontProducts } from "@/lib/generated-storefront-products";
import { HOMEPAGE_CATEGORIES } from "@/lib/featured-collections";
import { toBanglaDigits } from "@/lib/bangla-digits";
import { POLICY_FACTS } from "@/lib/site-pages";

// Phosphor "Handbag" (light): https://github.com/phosphor-icons/core/blob/main/LICENSE
function BagIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="m237.9 198.36l-14.25-120a14.06 14.06 0 0 0-14-12.36H174v-2a46 46 0 0 0-92 0v2H46.33a14.06 14.06 0 0 0-14 12.36l-14.25 120a14 14 0 0 0 14 15.64h191.84a14 14 0 0 0 14-15.64ZM94 64a34 34 0 0 1 68 0v2H94Zm131.5 137.3a2.07 2.07 0 0 1-1.58.7H32.08a2.07 2.07 0 0 1-1.58-.7a1.92 1.92 0 0 1-.49-1.53l14.26-120A2 2 0 0 1 46.33 78H82v26a6 6 0 0 0 12 0V78h68v26a6 6 0 0 0 12 0V78h35.67a2 2 0 0 1 2.06 1.77l14.26 120a1.92 1.92 0 0 1-.49 1.53"
      />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path d="M11.5 21C16.7467 21 21 16.7467 21 11.5C21 6.25329 16.7467 2 11.5 2C6.25329 2 2 6.25329 2 11.5C2 16.7467 6.25329 21 11.5 21Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 22L20 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MenuLinesIcon({ className }: { className?: string }) {
  // Two hairlines, the same mark as the header's menu button.
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M5 9.5h14M5 14.5h9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function HomeDuotoneIcon({ className }: { className?: string }) {
  // A thin outline house with a smile line, drawn at the dock's 1.4 stroke.
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M3.5 10.2 12 3.8l8.5 6.4V19a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M9 15.5c1.7 1.3 4.3 1.3 6 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

const MEMO_SHOP_LINKS = [
  ["ফ্রেশ আম", "/collection/fresh-mango"],
  ["হোমমেড", "/collection/homemade"],
  ["গুড়", "/collection/jaggery"],
  ["সব পণ্য", "/products"],
] as const;

// Every help page, listed in the footer's "সহায়তা ও নীতিমালা" column.
const CONTACT_WHATSAPP_HREF = "https://api.whatsapp.com/send/?phone=8801303103540";

const POLICY_LINKS = [
  ["গোপনীয়তা নীতি", "/privacy-policy"],
  ["রিফান্ড ও রিটার্ন", "/refund-return-exchange"],
  ["শর্তাবলি", "/terms-and-conditions"],
  ["শিপিং নীতি", "/shipping-policy"],
  ["পেমেন্ট নীতি", "/payment-policy"],
  ["বাতিলের নীতি", "/cancellation-policy"],
  ["কীভাবে অর্ডার করবেন", "/how-to-order"],
  ["অর্ডার ট্র্যাক", "/track-order"],
  ["প্রশ্নোত্তর", "/faq"],
  ["যোগাযোগ", "/contact-us"],
] as const;

// A 40px search suggestion thumbnail was pulling the 960px original; `sizes`
// lets the browser take the 320px variant instead.
function SuggestionThumbnail({ product }: { product: StorefrontProduct }) {
  const { src, srcSet } = getProductImageSet(product);
  if (!src) return null;

  return (
    <img
      src={src}
      srcSet={srcSet}
      sizes={srcSet ? "40px" : undefined}
      alt=""
      loading="lazy"
      decoding="async"
      className="h-full w-full object-cover"
    />
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();
  const [location, setLocation] = useLocation();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isContactOpen, setIsContactOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  // Every page mounts its own Layout, so a shared layoutId made the next page's dock highlight
  // fly in from where the previous page's highlight was measured (lower, when it was scrolled).
  // A per-instance id keeps the slide within a page and starts a new page's highlight in place.
  const dockHighlightId = `sk-dock-highlight-${useId()}`;
  const { setIsOpen: setCartOpen, itemCount, cartPulseKey, consumeCartPulse } = useCart();
  const { data: searchableProducts = [] } = useQuery({
    queryKey: ["merchant-suite-products-listing"],
    queryFn: fetchStorefrontProducts,
    ...STOREFRONT_CATALOG_QUERY_OPTIONS,
    initialData: generatedStorefrontProducts,
    initialDataUpdatedAt: 0,
    enabled: isSearchOpen,
  });

  const activeDockKey = isOpen
    ? "menu"
    : isSearchOpen
      ? "search"
      : location === "/"
        ? "home"
        : null;

  const openSearch = () => {
    setIsContactOpen(false);
    setIsSearchOpen(true);
  };
  const openMenu = () => {
    setIsContactOpen(false);
    setIsOpen(true);
  };
  const openCart = () => {
    setIsContactOpen(false);
    setCartOpen(true);
  };
  const goHome = (event: MouseEvent<HTMLAnchorElement>) => {
    setIsContactOpen(false);
    setIsOpen(false);
    setIsSearchOpen(false);
    if (location === "/") {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: shouldReduceMotion ? "auto" : "smooth" });
    }
  };
  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchQuery.trim();
    setLocation(query ? `/products?search=${encodeURIComponent(query)}` : "/products");
    setIsSearchOpen(false);
  };
  const suggestions = searchStorefrontProducts(searchableProducts, searchQuery).slice(0, 5);

  return (
    <div className="min-h-screen flex flex-col md:bg-brand-ivory text-black selection:bg-brand-gold selection:text-white">
      {/* Announcement: one hairline row of delivery facts (Stage redesign, 2026-10-19); the first fact only on phones */}
      <div className="stc stc-announce" role="region" aria-label="ঘোষণা">
        <span>
          <span className="num">৳{toBanglaDigits(POLICY_FACTS.freeDeliveryThreshold.toLocaleString("en-IN"))}</span>+ অর্ডারে <b>ফ্রি ডেলিভারি</b>
        </span>
        <span>
          সারা দেশে <b>ক্যাশ অন ডেলিভারি</b>
        </span>
        <span>
          ঢাকায় <b>{toBanglaDigits(POLICY_FACTS.dhakaDeliveryDays.replace(" days", ""))} দিনে</b>, বাইরে{" "}
          <b>{toBanglaDigits(POLICY_FACTS.outsideDhakaDeliveryDays.replace(" days", ""))} দিনে</b>
        </span>
      </div>
      {/* Navigation: links left, logo centred, search and bag right; on phones the menu button takes the links' place */}
      <div className="stc stc-head" data-page-header="">
        <header className="stc-frame stc-head-in">
          <button
            type="button"
            className="stc-menu press"
            aria-label="Open menu"
            aria-expanded={isOpen}
            onClick={openMenu}
          >
            <i />
            <i />
          </button>
          <nav className="stc-nav" aria-label="Main">
            <Link href="/products">সব পণ্য</Link>
            <Link href="/collection/jaggery">খেজুরের গুড়</Link>
            <Link href="/collection/homemade">হোমমেড</Link>
            <Link href="/about-us">আমাদের গল্প</Link>
          </nav>
          <Link href="/" aria-label="সেরা খাবার — হোম" onClick={goHome}>
            <img className="c-logoimg" src={headerLogo} alt="Sera Khabar" width={381} height={256} />
          </Link>
          <div className="stc-tools">
            <button type="button" className="press" onClick={openSearch} aria-label="Search">
              <SearchIcon className="h-5 w-5" />
              <span className="stc-label">খুঁজুন</span>
            </button>
            <button
              type="button"
              className="press"
              onClick={() => setCartOpen(true)}
              aria-label={`Cart${itemCount > 0 ? `, ${itemCount} items` : ""}`}
            >
              <span className="stc-bag">
                <BagIcon className="h-6 w-6" />
                {itemCount > 0 ? <span className="stc-count num">{toBanglaDigits(itemCount > 99 ? "99+" : itemCount)}</span> : null}
              </span>
              <span className="stc-label">ব্যাগ</span>
            </button>
          </div>
        </header>
      </div>

      {/* Mobile bottom navigation: compact white pill, always at the bottom (approved 2026-10-13, "Label").
          Order (2026-10-19): হোম · মেনু · contact seal · খুঁজুন · ব্যাগ, with the seal exactly in the middle. */}
      <nav aria-label="Mobile navigation" className="sk-dock md:hidden">
        <DockContactCard open={isContactOpen} onOpenChange={setIsContactOpen} />
        <div className="sk-dock-pill">
          {[
            { key: "home", label: "হোম", href: "/", icon: <HomeDuotoneIcon className="h-5 w-5" /> },
            { key: "menu", label: "মেনু", onClick: openMenu, icon: <MenuLinesIcon className="h-5 w-5" /> },
            { key: "contact" },
            { key: "search", label: "খুঁজুন", onClick: openSearch, icon: <SearchIcon className="h-5 w-5" /> },
          ].map((item) => {
            if (item.key === "contact") {
              return <DockContactSeal key="contact" open={isContactOpen} onOpenChange={setIsContactOpen} />;
            }
            const isActive = item.key === activeDockKey;
            const content = (
              <>
                <span className="sk-dock-ic">{item.icon}</span>
                {/* The active tab is marked by a small dot under its icon; it glides between tabs. */}
                {isActive && (
                  <motion.span
                    layoutId={dockHighlightId}
                    className="sk-dock-dot"
                    aria-hidden="true"
                    transition={{ duration: shouldReduceMotion ? 0 : 0.22, ease: [0.23, 1, 0.32, 1] }}
                  />
                )}
              </>
            );
            return item.href ? (
              <Link
                key={item.key}
                href={item.href}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
                onClick={() => setIsContactOpen(false)}
                className={`sk-dock-item${isActive ? " is-active" : ""}`}
              >
                {content}
              </Link>
            ) : (
              <button
                key={item.key}
                type="button"
                aria-label={item.label}
                onClick={item.onClick}
                className={`sk-dock-item${isActive ? " is-active" : ""}`}
              >
                {content}
              </button>
            );
          })}
          <button
            type="button"
            aria-label={`Cart${itemCount > 0 ? `, ${itemCount} items` : ""}`}
            onClick={openCart}
            onAnimationEnd={() => { if (cartPulseKey > 0) consumeCartPulse(); }}
            className={`sk-dock-cart${cartPulseKey > 0 ? " cart-dock-pulse" : ""}`}
          >
            <BagIcon className="!h-6 !w-6" />
            {itemCount > 0 && (
              <span aria-hidden="true" className="sk-dock-badge">
                {toBanglaDigits(itemCount > 99 ? "99+" : itemCount)}
              </span>
            )}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSearchOpen(false)}
            className="fixed inset-0 z-[100] flex items-start justify-center bg-black/10 p-3 sm:p-4 md:px-4 md:pt-[16vh] md:backdrop-blur-md"
          >
            <motion.div
            initial={{ opacity: 0, y: -28, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -18, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 360, damping: 28, mass: 0.7 }}
              onClick={(event) => event.stopPropagation()}
              className="relative h-auto max-h-[70dvh] w-full max-w-none overflow-y-auto rounded-[12px] bg-white px-5 pb-8 pt-5 md:h-auto md:max-h-none md:max-w-xl md:overflow-hidden md:rounded-2xl md:border md:border-black/10 md:p-3 md:shadow-2xl"
            >
              <form onSubmit={submitSearch} className="flex items-center justify-start gap-3 border-b border-black/10 px-0 py-4 md:rounded-xl md:border md:bg-[#fafafa] md:px-4 md:py-3">
                <SearchIcon className="h-5 w-5 shrink-0 text-black/60" />
                <input autoFocus value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search products" aria-label="Search products" className="min-w-0 flex-1 bg-transparent text-left text-base outline-none placeholder:text-black/40" />
                <button type="button" onClick={() => setIsSearchOpen(false)} aria-label="Close search" className="rounded-full p-1 text-black/50 transition-colors hover:bg-black/5 hover:text-black">
                  <X size={19} strokeWidth={1.5} />
                </button>
              </form>
              <div className="px-0 pb-2 pt-5 md:px-2">
                <p className="mb-3 text-[9px] font-medium uppercase tracking-[0.3em] text-black/45">
                  {searchQuery ? "Suggestions" : "Popular searches"}
                </p>
                <div className="space-y-1">
                  {suggestions.length > 0 ? suggestions.map((product) => (
                    <button
                      key={product.slug}
                      type="button"
                      onClick={() => {
                        setLocation(`/product/${product.slug}`);
                        setIsSearchOpen(false);
                      }}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm text-black/75 transition-colors hover:bg-white/60 hover:text-black"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-black/5">
                          <SuggestionThumbnail product={product} />
                        </span>
                        <span className="truncate">{product.name}</span>
                      </span>
                      <ArrowUpRight size={15} strokeWidth={1.5} className="ml-3 shrink-0 text-black/35" />
                    </button>
                  )) : (
                    <p className="px-3 py-2 text-sm text-black/45">No matching products.</p>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Menu: Vaul bottom sheet on phones, floating left panel on desktop — drag, tap outside or ✕ to close */}
      <Drawer.Root open={isOpen} onOpenChange={setIsOpen} direction={isMobile ? "bottom" : "left"}>
        <Drawer.Portal>
          <Drawer.Overlay className="sk-sheet-overlay" />
          <Drawer.Content
            className={isMobile ? "sk-sheet sk-menu-sheet stc" : "sk-panel sk-panel-left sk-menu-sheet stc"}
            aria-describedby={undefined}
          >
            <Drawer.Title className="sr-only">Menu</Drawer.Title>
            {isMobile && <div className="sk-sheet-grab" aria-hidden="true" />}
            <div className="stm">
              <div className="stm-head">
                <span className="display">
                  কী <b>খুঁজছেন?</b>
                </span>
                <button type="button" onClick={() => setIsOpen(false)} aria-label="Close menu" className="stm-close press">
                  <X className="h-5 w-5" strokeWidth={1.3} />
                </button>
              </div>
              <nav aria-label="Categories" className="stm-cats">
                {HOMEPAGE_CATEGORIES.map((category, index) => (
                  <Link
                    key={category.slug}
                    href={`/collection/${category.slug}`}
                    onClick={() => setIsOpen(false)}
                    className="stm-cat press"
                    style={{ "--i": index } as CSSProperties}
                  >
                    <img src={category.image} alt="" decoding="async" />
                    <b>{category.name}</b>
                    <small>{category.en}</small>
                  </Link>
                ))}
              </nav>
              <nav aria-label="Mobile menu" className="stm-rows">
                {[
                  { href: "/", bn: "হোম", en: "Home" },
                  { href: "/products", bn: "সব পণ্য", en: "All products" },
                  { href: "/collection/top-selling-products", bn: "সেরা বিক্রিত পণ্য", en: "Top Selling Products", hot: true },
                ].map((row, index) => (
                  <Link
                    key={row.href}
                    href={row.href}
                    onClick={() => setIsOpen(false)}
                    className="stm-row"
                    aria-label={`${row.bn} (${row.en})`}
                    style={{ "--i": index + 3 } as CSSProperties}
                  >
                    <span className="num">{toBanglaDigits(String(index + 1).padStart(2, "0"))}</span>
                    <b>{row.bn}</b>
                    {row.hot ? <em>জনপ্রিয়</em> : <span />}
                    <i aria-hidden="true">→</i>
                  </Link>
                ))}
              </nav>
              <div className="stm-contact" style={{ "--i": 6 } as CSSProperties}>
                <a href="tel:+8801310980289" className="press">
                  <span>কল করুন</span>
                  <b className="num">০১৩১০-৯৮০২৮৯</b>
                </a>
                <a href={CONTACT_WHATSAPP_HREF} target="_blank" rel="noopener noreferrer" className="press">
                  <span>হোয়াটসঅ্যাপ</span>
                  <b className="num">০১৩০৩-১০৩৫৪০</b>
                </a>
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Cart Drawer */}
      <CartDrawer />
      <CartAddedToast />

      {/* Subtle Depth moves content only; fixed navigation and drawers stay outside. */}
      <main className="flex-grow overflow-hidden bg-[#faf4ea]">
        <PageContentTransition>{children}</PageContentTransition>
      </main>

      {/* Wordmark footer (Stage redesign, 2026-10-19): statement and contact rows, link columns, the logo across the width */}
      <footer className="stc stc-foot">
        <div className="stc-frame">
          <div className="st-row stc-f-top">
            <div className="st-cell">
              <h2 className="display">
                প্রকৃতির স্বাদ, <b>যত্নের সঙ্গে</b> পৌঁছে দিই আপনার ঘরে।
              </h2>
              <p className="stc-f-about">
                সাধ্যের মধ্যে সেরা মানের পণ্য আপনার ও আপনার পরিবারের জন্য, যা আমরা পাঠাই একদম মাঠ পর্যায় থেকে।
              </p>
            </div>
            <div className="st-cell">
              <div className="stc-f-lab">কথা বলুন</div>
              <a className="stc-f-row" href={CONTACT_WHATSAPP_HREF} target="_blank" rel="noopener noreferrer">
                <span>হোয়াটসঅ্যাপ</span>
                <span className="num">০১৩০৩-১০৩৫৪০</span>
                <i aria-hidden="true">→</i>
              </a>
              <a className="stc-f-row" href="tel:+8801310980289">
                <span>কল করুন</span>
                <span className="num">০১৩১০-৯৮০২৮৯</span>
                <i aria-hidden="true">→</i>
              </a>
              <a className="stc-f-row" href="mailto:serakhabar518@gmail.com">
                <span>ইমেইল</span>
                <span>serakhabar518@gmail.com</span>
                <i aria-hidden="true">→</i>
              </a>
            </div>
          </div>
          <div className="st-row stc-f-cols">
            <div className="st-cell">
              <h4>কেনাকাটা</h4>
              <ul>
                {MEMO_SHOP_LINKS.map(([label, href]) => (
                  <li key={href}>
                    <Link href={href} className="stc-fl">{label}</Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="st-cell">
              <h4>আরও</h4>
              <ul>
                <li>
                  <Link href="/about-us" className="stc-fl">আমাদের গল্প</Link>
                </li>
                <li>
                  <a className="stc-fl" href={`${CONTACT_WHATSAPP_HREF}&text=${encodeURIComponent("পাইকারি অর্ডার করতে চাই")}`} target="_blank" rel="noopener noreferrer">
                    পাইকারি অর্ডার
                  </a>
                </li>
              </ul>
            </div>
            <div className="st-cell stc-f-pol">
              <h4>সহায়তা ও নীতিমালা</h4>
              <ul aria-label="Policies">
                {POLICY_LINKS.map(([label, href]) => (
                  <li key={href}>
                    <Link href={href} className="stc-fl">{label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="stc-f-word">
            <img src="/sera-khabar-logo.svg" alt="সেরা খাবার" width={3500} height={640} loading="lazy" decoding="async" />
          </div>
          <div className="stc-f-legal">
            <span>
              © <span className="num">২০২৬</span> সেরা খাবার · নওহাটা, পবা, রাজশাহী <span className="num">৬২১৩</span>
            </span>
            {/* Bottom Bar */}
            <a className="stc-arc" href="https://api.whatsapp.com/send/?phone=8801733670129" target="_blank" rel="noopener noreferrer">
              <small>Designed &amp; Engineered by</small>
              <span className="stc-arc-divider" aria-hidden="true" />
              <img src="/arc-credit.webp" alt="Arc Labs Corporation" width={188} height={72} loading="lazy" decoding="async" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
