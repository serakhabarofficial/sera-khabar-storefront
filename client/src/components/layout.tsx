import { Link, useLocation } from "wouter";
import { ArrowUpRight, ArrowRight, ShieldCheck, X } from "lucide-react";
import { Box as ReiconBox } from "reicon-react";
import { useState, type CSSProperties, type FormEvent, type MouseEvent } from "react";
import { useQuery } from "@tanstack/react-query";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useCart } from "@/contexts/cart-context";
import CartDrawer from "@/components/cart-drawer";
import CartAddedToast from "@/components/cart-added-toast";
import { PageContentTransition } from "@/components/page-transition";
import SkewReveal from "@/components/skew-reveal";
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

function BagIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path fill="currentColor" d="M16 9a1 1 0 1 1-2 0a1 1 0 0 1 2 0m-6 0a1 1 0 1 1-2 0a1 1 0 0 1 2 0" />
      <path fill="currentColor" fillRule="evenodd" d="M12 2.75A2.25 2.25 0 0 0 9.75 5v.254q.626-.005 1.355-.004h1.79q.73-.001 1.355.004V5A2.25 2.25 0 0 0 12 2.75m3.75 2.557V5a3.75 3.75 0 0 0-7.5 0v.307q-.202.014-.391.035c-.878.095-1.613.293-2.265.74a5 5 0 0 0-.63.516c-.566.552-.905 1.234-1.17 2.076c-.257.819-.465 1.859-.727 3.166l-.019.095c-.376 1.883-.673 3.367-.758 4.549c-.088 1.208.034 2.223.606 3.104q.288.442.664.81c.752.734 1.724 1.052 2.925 1.204c1.176.148 2.69.148 4.61.148h1.81c1.921 0 3.434 0 4.61-.148c1.201-.152 2.174-.47 2.925-1.204a4.8 4.8 0 0 0 .664-.81c.572-.88.694-1.896.607-3.104c-.086-1.182-.382-2.666-.76-4.549l-.018-.095c-.261-1.307-.47-2.347-.727-3.166c-.265-.842-.604-1.524-1.17-2.076a5 5 0 0 0-.63-.516c-.652-.447-1.387-.645-2.265-.74a11 11 0 0 0-.39-.035M8.02 6.833c-.747.08-1.208.233-1.578.486a3.3 3.3 0 0 0-.431.354c-.321.313-.56.735-.786 1.451c-.23.733-.424 1.693-.695 3.052c-.39 1.948-.667 3.34-.744 4.416c-.077 1.062.052 1.693.368 2.179q.196.302.454.554c.415.405 1.008.655 2.065.789c1.07.135 2.49.136 4.476.136h1.703c1.986 0 3.404-.001 4.475-.136c1.057-.134 1.65-.384 2.065-.789a3.3 3.3 0 0 0 .454-.554c.316-.486.445-1.117.369-2.18c-.078-1.076-.355-2.467-.744-4.415c-.272-1.359-.465-2.32-.696-3.052c-.225-.716-.465-1.138-.786-1.451a3 3 0 0 0-.43-.354c-.37-.253-.832-.405-1.579-.486c-.763-.082-1.743-.083-3.129-.083H11.15c-1.386 0-2.366.001-3.13.083" clipRule="evenodd" />
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
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path fillRule="evenodd" clipRule="evenodd" d="M20.75 7C20.75 7.41421 20.4142 7.75 20 7.75L4 7.75C3.58579 7.75 3.25 7.41421 3.25 7C3.25 6.58579 3.58579 6.25 4 6.25L20 6.25C20.4142 6.25 20.75 6.58579 20.75 7Z" />
      <path fillRule="evenodd" clipRule="evenodd" d="M20.75 12C20.75 12.4142 20.4142 12.75 20 12.75L4 12.75C3.58579 12.75 3.25 12.4142 3.25 12C3.25 11.5858 3.58579 11.25 4 11.25L20 11.25C20.4142 11.25 20.75 11.5858 20.75 12Z" />
      <path fillRule="evenodd" clipRule="evenodd" d="M20.75 17C20.75 17.4142 20.4142 17.75 20 17.75L4 17.75C3.58579 17.75 3.25 17.4142 3.25 17C3.25 16.5858 3.58579 16.25 4 16.25L20 16.25C20.4142 16.25 20.75 16.5858 20.75 17Z" />
    </svg>
  );
}

function HomeDuotoneIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M9.44661 15.3975C9.11385 15.1508 8.64413 15.2206 8.39748 15.5534C8.15082 15.8862 8.22062 16.3559 8.55339 16.6025C9.5258 17.3233 10.715 17.75 12 17.75C13.285 17.75 14.4742 17.3233 15.4466 16.6025C15.7794 16.3559 15.8492 15.8862 15.6025 15.5534C15.3559 15.2208 14.8862 15.1508 14.5534 15.3975C13.825 15.9373 12.9459 16.25 12 16.25C11.0541 16.25 10.175 15.9373 9.44661 15.3975Z" fill="currentColor" opacity="0.55" />
      <path fillRule="evenodd" clipRule="evenodd" d="M12 1.25C11.2919 1.25 10.6485 1.45282 9.95055 1.79224C9.27585 2.12035 8.49642 2.60409 7.52286 3.20832L5.45628 4.4909C4.53509 5.06261 3.79744 5.5204 3.2289 5.95581C2.64015 6.40669 2.18795 6.86589 1.86131 7.46263C1.53535 8.05812 1.38857 8.69174 1.31819 9.4407C1.24999 10.1665 1.24999 11.0541 1.25 12.1672V13.7799C1.24999 15.6837 1.24998 17.1866 1.4027 18.3616C1.55937 19.567 1.88856 20.5401 2.63236 21.3094C3.37958 22.0824 4.33046 22.4277 5.50761 22.5914C6.64849 22.75 8.10556 22.75 9.94185 22.75H14.0581C15.8944 22.75 17.3515 22.75 18.4924 22.5914C19.6695 22.4277 20.6204 22.0824 21.3676 21.3094C22.1114 20.5401 22.4406 19.567 22.5973 18.3616C22.75 17.1866 22.75 15.6838 22.75 13.7799V12.1672C22.75 11.0541 22.75 10.1665 22.6818 9.4407C22.6114 8.69174 22.4646 8.05812 22.1387 7.46263C21.8121 6.86589 21.3599 6.40669 20.7711 5.95581C20.2026 5.5204 19.4649 5.06262 18.5437 4.49091L16.4771 3.20831C15.5036 2.60409 14.7241 2.12034 14.0494 1.79224C13.3515 1.45282 12.7081 1.25 12 1.25ZM8.27953 4.50412C9.29529 3.87371 10.0095 3.43153 10.6065 3.1412C11.1882 2.85833 11.6002 2.75 12 2.75C12.3998 2.75 12.8118 2.85833 13.3935 3.14119C13.9905 3.43153 14.7047 3.87371 15.7205 4.50412L17.7205 5.74537C18.6813 6.34169 19.3559 6.76135 19.8591 7.1467C20.3487 7.52164 20.6303 7.83106 20.8229 8.18285C21.0162 8.53589 21.129 8.94865 21.1884 9.58104C21.2492 10.2286 21.25 11.0458 21.25 12.2039V13.725C21.25 15.6959 21.2485 17.1012 21.1098 18.1683C20.9736 19.2163 20.717 19.8244 20.2892 20.2669C19.8649 20.7058 19.2871 20.9664 18.2858 21.1057C17.2602 21.2483 15.9075 21.25 14 21.25H10C8.09247 21.25 6.73983 21.2483 5.71422 21.1057C4.71286 20.9664 4.13514 20.7058 3.71079 20.2669C3.28301 19.8244 3.02642 19.2163 2.89019 18.1683C2.75149 17.1012 2.75 15.6959 2.75 13.725V12.2039C2.75 11.0458 2.75076 10.2286 2.81161 9.58104C2.87103 8.94865 2.98385 8.53589 3.17709 8.18285C3.36965 7.83106 3.65133 7.52164 4.14092 7.1467C4.6441 6.76135 5.31869 6.34169 6.27953 5.74537L8.27953 4.50412Z" fill="currentColor" />
    </svg>
  );
}

const MEMO_SHOP_LINKS = [
  ["ফ্রেশ আম", "/collection/fresh-mango"],
  ["হোমমেড", "/collection/homemade"],
  ["গুড়", "/collection/jaggery"],
  ["সব পণ্য", "/products"],
] as const;

// The approved memo shows three policy links; the other help pages stay reachable here too.
const POLICY_LINKS = [
  ["Privacy Policy", "/privacy-policy"],
  ["Refund & Return", "/refund-return-exchange"],
  ["Terms & Conditions", "/terms-and-conditions"],
  ["Shipping Policy", "/shipping-policy"],
  ["Payment Policy", "/payment-policy"],
  ["Cancellation Policy", "/cancellation-policy"],
  ["How to Order", "/how-to-order"],
  ["Track Order", "/track-order"],
  ["FAQ", "/faq"],
  ["Contact", "/contact-us"],
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
  const shouldReduceMotion = useReducedMotion();
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
        : location === "/products" || location.startsWith("/product/") || location.startsWith("/collection/")
          ? "products"
          : null;

  const openSearch = () => setIsSearchOpen(true);
  const openMenu = () => setIsOpen(true);
  const goHome = (event: MouseEvent<HTMLAnchorElement>) => {
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
      {/* Announcement Bar: turmeric "Poster" sign (approved 2026-10-13); one row on desktop, two centred lines on phones */}
      <div className="sk-announce" role="region" aria-label="ঘোষণা">
        <div className="sk-announce-text">
          <span className="sk-announce-script">শীতের নতুন গুড়</span>
          <b>
            <span className="num">৳{toBanglaDigits(POLICY_FACTS.freeDeliveryThreshold)}</span>+ অর্ডারে ডেলিভারি ফ্রি
          </b>
        </div>
        <span className="sk-announce-stamp">ক্যাশ অন ডেলিভারি</span>
        <Link href="/collection/jaggery" className="sk-announce-cta">
          কিনুন <i aria-hidden="true" />
        </Link>
      </div>
      {/* Navigation */}
      <div className="sk sk-header" data-page-header="">
        <div className="wrap">
          <header className="c-head">
            <nav className="menu" aria-label="Main">
              <button type="button" className="menu-btn press" aria-label="Open menu" onClick={openMenu}>
                <svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true">
                  <circle cx="12" cy="12" r="11.75" fill="#F6B826" />
                  <path d="M8 8h8M8 12h8M8 16h8" stroke="#000" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
              <button type="button" className="link" onClick={openMenu}>Menu</button>
              <Link href="/products" className="link">Shop</Link>
              <Link href="/about-us" className="link">About Us</Link>
            </nav>
            <Link href="/" aria-label="সেরা খাবার — হোম" onClick={goHome}>
              <img className="c-logoimg" src={headerLogo} alt="Sera Khabar" />
            </Link>
            <div className="tools">
              <button type="button" className="icon-btn press" onClick={openSearch} aria-label="Search">
                <SearchIcon className="h-5 w-5" />
              </button>
              <button
                type="button"
                className="bag press"
                onClick={() => setCartOpen(true)}
                aria-label={`Cart${itemCount > 0 ? `, ${itemCount} items` : ""}`}
              >
                {itemCount > 0 ? (
                  <span className="num">{toBanglaDigits(itemCount > 99 ? "99+" : itemCount)}</span>
                ) : (
                  <BagIcon className="h-5 w-5" />
                )}
              </button>
            </div>
          </header>
        </div>
      </div>

      {/* Mobile bottom navigation: compact white pill, always at the bottom (approved 2026-10-13, "Label") */}
      <nav aria-label="Mobile navigation" className="sk-dock md:hidden">
        <div className="sk-dock-pill">
          {[
            { key: "home", label: "হোম", href: "/", icon: <HomeDuotoneIcon className="h-5 w-5" /> },
            { key: "products", label: "পণ্য", href: "/products", icon: <ReiconBox size={20} color="currentColor" weight="Outline" /> },
            { key: "search", label: "খুঁজুন", onClick: openSearch, icon: <SearchIcon className="h-5 w-5" /> },
            { key: "menu", label: "মেনু", onClick: openMenu, icon: <MenuLinesIcon className="h-5 w-5" /> },
          ].map((item) => {
            const isActive = item.key === activeDockKey;
            const content = (
              <>
                {isActive && (
                  <motion.span
                    layoutId="sk-dock-highlight"
                    className="sk-dock-hl"
                    aria-hidden="true"
                    transition={{ duration: shouldReduceMotion ? 0 : 0.22, ease: [0.23, 1, 0.32, 1] }}
                  />
                )}
                <span className="sk-dock-ic">{item.icon}</span>
                {isActive && <span className="sk-dock-lbl">{item.label}</span>}
              </>
            );
            return item.href ? (
              <Link
                key={item.key}
                href={item.href}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
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
            onClick={() => setCartOpen(true)}
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
            className={isMobile ? "sk-sheet sk-menu-sheet" : "sk-panel sk-panel-left sk-menu-sheet"}
            aria-describedby={undefined}
          >
            <Drawer.Title className="sr-only">Menu</Drawer.Title>
            {isMobile && <div className="sk-sheet-grab" aria-hidden="true" />}
            <div className="skm">
              <div className="skm-head">
                <div>
                  <span className="skm-ask">কী খুঁজছেন?</span>
                  <span className="skm-title">সেরা খাবার মেনু</span>
                </div>
                <button type="button" onClick={() => setIsOpen(false)} aria-label="Close menu" className="skm-close press">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav aria-label="Categories" className="skm-cats">
                {HOMEPAGE_CATEGORIES.map((category, index) => (
                  <Link
                    key={category.slug}
                    href={`/collection/${category.slug}`}
                    onClick={() => setIsOpen(false)}
                    className="skm-cat press"
                    style={{ "--c": category.color, "--i": index } as CSSProperties}
                    data-light={category.light || undefined}
                  >
                    <img src={category.image} alt="" decoding="async" />
                    <span className="skm-no num">{toBanglaDigits(String(index + 1).padStart(2, "0"))}</span>
                    <b>{category.name}</b>
                    <small>{category.en}</small>
                  </Link>
                ))}
              </nav>
              <nav aria-label="Mobile menu" className="skm-links">
                {[
                  { href: "/", bn: "হোম", en: "Home" },
                  { href: "/products", bn: "সব পণ্য", en: "All products" },
                  { href: "/collection/top-selling-products", bn: "সেরা বিক্রিত পণ্য", en: "Top Selling Products", hot: true },
                ].map((row) => (
                  <Link key={row.href} href={row.href} onClick={() => setIsOpen(false)} className="skm-row press">
                    <b>{row.bn}<small>{row.en}</small></b>
                    {row.hot && <span className="skm-hot">জনপ্রিয়</span>}
                    <i aria-hidden="true"><ArrowRight size={16} /></i>
                  </Link>
                ))}
              </nav>
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

      {/* Cash memo footer (approved 2026-10-13) */}
      <footer className="sk">
        <div className="fa">
          <div className="memo-w">
            <span className="tack" />
            <div className="memo">
              <div className="memo-top">
                <img src={headerLogo} alt="সেরা খাবার" loading="lazy" decoding="async" />
                <div className="memo-title">
                  <SkewReveal as="b" enabled={location === "/"}>ক্যাশ মেমো</SkewReveal>
                  <span>প্রকৃতির স্বাদ, যত্নের সঙ্গে পৌঁছে দিই আপনার ঘরে।</span>
                </div>
                <div className="memo-no">
                  নং <span className="num">২০২৬</span>
                  <br />
                  তারিখ: আজ
                </div>
              </div>
              <div className="memo-cols">
                <div>
                  <div className="memo-h">কেনাকাটা</div>
                  {MEMO_SHOP_LINKS.map(([label, href]) => (
                    <Link key={label} href={href} className="memo-row">
                      {label}
                      <em>→</em>
                    </Link>
                  ))}
                </div>
                <div>
                  <div className="memo-h">যোগাযোগ</div>
                  <a className="memo-row" href="tel:+8801310980289">কল করুন<em>→</em></a>
                  <a className="memo-row" href="https://api.whatsapp.com/send/?phone=8801303103540" target="_blank" rel="noopener noreferrer">হোয়াটসঅ্যাপ করুন<em>→</em></a>
                  <Link href="/about-us" className="memo-row">আমাদের গল্প<em>→</em></Link>
                  <a className="memo-row" href={`https://api.whatsapp.com/send/?phone=8801303103540&text=${encodeURIComponent("পাইকারি অর্ডার করতে চাই")}`} target="_blank" rel="noopener noreferrer">পাইকারি অর্ডার<em>→</em></a>
                </div>
              </div>
              <div className="memo-foot">
                <p>
                  সাধ্যের মধ্যে সেরা মানের পন্য আপনার ও আপনার পরিবারের জন্য,
                  <br />
                  যা আমরা পাঠাই একদম মাঠ পর্যায় থেকে, তাই পাচ্ছেন সাশ্রয়ী দামে সেরা মানের পন্যের নিশ্চয়তা।
                </p>
                {/* Bottom Bar */}
                <a className="sign" href="https://api.whatsapp.com/send/?phone=8801733670129" target="_blank" rel="noopener noreferrer">
                  <img src="/arc-labs-emblem.webp" alt="Arc Labs Corporation" width={173} height={72} loading="lazy" decoding="async" />
                  <hr />
                  <small>Designed &amp; Engineered by</small>
                </a>
              </div>
              <div className="stampc" aria-hidden="true">
                ক্যাশ অন
                <br />
                ডেলিভারি
                <br />· সারা দেশে ·
              </div>
            </div>
          </div>
          <p className="f-copy">
            © <span className="num">২০২৬</span> সেরা খাবার · নওহাটা, পবা, রাজশাহী, বাংলাদেশ, <span className="num">৬২১৩</span>
          </p>
          <nav className="f-pol" aria-label="Policies">
            {POLICY_LINKS.map(([label, href]) => (
              <Link key={href} href={href}>• {label}</Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
