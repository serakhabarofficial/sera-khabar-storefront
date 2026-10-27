import { Switch, Route, useLocation } from "wouter";
import { AnimatePresence } from "framer-motion";
import { PageTransition } from "@/components/page-transition";
import { queueRouteScroll } from "@/lib/page-motion";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/contexts/cart-context";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import ProductPage from "@/pages/product";
import ProductsPage from "@/pages/products";
import BookingPage from "@/pages/booking";
import LandingThankYouPage from "@/pages/landing-thank-you";
import KatimonMangoPage from "@/pages/katimon-mango";
import HomemadePumpkinBoriPage from "@/pages/homemade-pumpkin-bori";
import AmSottoAcharPage from "@/pages/am-sotto-achar";
import AmSottoAcharThankYouPage from "@/pages/am-sotto-achar-thank-you";
import KhejurerGurPage from "@/pages/khejurer-gur";
import KhejurerGurThankYouPage from "@/pages/khejurer-gur-thank-you";
import { BORI_CAMPAIGN_WHATSAPP_HREF } from "@/features/landing/bori-content";
import { KATIMON_CAMPAIGN_WHATSAPP_HREF } from "@/features/landing/katimon-content";
import CollectionPage from "@/pages/collection";
import SiteInformationPage from "@/pages/site-information";
import { SITE_PAGES } from "@/lib/site-pages";
import { useEffect, useLayoutEffect, useRef } from "react";
import { trackMetaPageView } from "@/lib/meta-pixel";

const CAMPAIGN_PAGE_TITLES: Record<string, string> = {
  "/step/am-sotto-achar": "আমসত্ত্ব আচার | সেরা খাবার",
  "/step/am-sotto-achar/thank-you": "আমসত্ত্ব আচার অর্ডারের জন্য ধন্যবাদ | সেরা খাবার",
  "/step/khejurer-gur": "খেজুরের গুড় | সেরা খাবার",
  "/step/khejurer-gur/thank-you": "খেজুরের গুড় অর্ডারের জন্য ধন্যবাদ | সেরা খাবার",
  "/step/katimon-mango": "কাটিমন আম | সেরা খাবার",
  "/step/katimon-mango/thank-you": "কাটিমন আম অর্ডারের জন্য ধন্যবাদ | সেরা খাবার",
  "/step/homemade-pumpkin-bori": "কুমড়ো বড়ি | সেরা খাবার",
  "/step/homemade-pumpkin-bori/thank-you": "কুমড়ো বড়ি অর্ডারের জন্য ধন্যবাদ | সেরা খাবার",
};

function CampaignMetadata({ location }: { location: string }) {
  const pathname = location.endsWith("/") ? location.slice(0, -1) : location;
  const pageTitle = CAMPAIGN_PAGE_TITLES[pathname];

  useEffect(() => {
    if (!pageTitle) {
      return;
    }

    const previousTitle = document.title;
    let robots = document.head.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    const previousRobotsContent = robots?.getAttribute("content") ?? null;

    if (!robots) {
      robots = document.createElement("meta");
      robots.name = "robots";
      document.head.appendChild(robots);
    }

    document.title = pageTitle;
    robots.content = "noindex, nofollow";

    return () => {
      document.title = previousTitle;
      if (previousRobotsContent === null) {
        robots.remove();
      } else {
        robots.content = previousRobotsContent;
      }
    };
  }, [pageTitle]);

  return null;
}

function Router() {
  const [location] = useLocation();
  const scrollPositions = useRef(new Map<string, number>());
  const currentLocation = useRef(location);
  const isHistoryNavigation = useRef(false);
  const isInitialLoad = useRef(true);

  useLayoutEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    const saveCurrentScroll = () => {
      // Checkout covers the page without a route change; its scroll is not the page's.
      if (document.documentElement.hasAttribute("data-sk-checkout")) return;
      scrollPositions.current.set(currentLocation.current, window.scrollY);
    };

    const saveBeforeInternalNavigation = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) {
        return;
      }

      if (anchor.origin === window.location.origin) {
        saveCurrentScroll();
      }
    };

    const markHistoryNavigation = () => {
      // Same-path entries (closing checkout) don't change the route, so no scroll reset follows to clear the flag.
      if (window.location.pathname === currentLocation.current) return;
      saveCurrentScroll();
      isHistoryNavigation.current = true;
    };

    window.addEventListener("scroll", saveCurrentScroll, { passive: true });
    document.addEventListener("click", saveBeforeInternalNavigation, true);
    document.addEventListener("touchstart", saveBeforeInternalNavigation, { capture: true, passive: true });
    // Register during layout, before wouter's passive location subscriptions.
    window.addEventListener("popstate", markHistoryNavigation, true);
    window.addEventListener("beforeunload", saveCurrentScroll);

    return () => {
      window.removeEventListener("scroll", saveCurrentScroll);
      document.removeEventListener("click", saveBeforeInternalNavigation, true);
      document.removeEventListener("touchstart", saveBeforeInternalNavigation, true);
      window.removeEventListener("popstate", markHistoryNavigation, true);
      window.removeEventListener("beforeunload", saveCurrentScroll);
    };
  }, []);

  useLayoutEffect(() => {
    // On a full page load (refresh), the browser has already restored the
    // scroll position — forcing it to 0 here causes a visible flick to the hero.
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      currentLocation.current = location;
      return;
    }

    const savedY = scrollPositions.current.get(location);
    const isBack = isHistoryNavigation.current && savedY !== undefined;
    const targetY = isBack ? savedY : 0;
    isHistoryNavigation.current = false;
    currentLocation.current = location;

    // The outgoing page is still fading out here, so scrolling now would make it jump.
    // The entering page applies this target before its first paint (see PageTransition).
    queueRouteScroll(targetY, isBack);
  }, [location]);

  // One Meta PageView per route, the first load included (index.html turns off the Pixel's own).
  useEffect(() => {
    trackMetaPageView();
  }, [location]);

  return (
    <>
      <CampaignMetadata location={location} />
      {/* Settle: the old page fades out completely, then the new one fades in. */}
      <AnimatePresence mode="wait">
        <Switch location={location} key={location}>
          <Route path="/step/katimon-mango/thank-you">
            <PageTransition standalone><LandingThankYouPage backHref="/step/katimon-mango" backLabel="কাটিমন আম অর্ডার পেজে ফিরে যান" whatsappHref={KATIMON_CAMPAIGN_WHATSAPP_HREF} /></PageTransition>
          </Route>
          <Route path="/step/katimon-mango">
            <PageTransition standalone><KatimonMangoPage /></PageTransition>
          </Route>
          <Route path="/step/homemade-pumpkin-bori/thank-you">
            <PageTransition standalone><LandingThankYouPage backHref="/step/homemade-pumpkin-bori" backLabel="কুমড়ো বড়ি অর্ডার পেজে ফিরে যান" whatsappHref={BORI_CAMPAIGN_WHATSAPP_HREF} /></PageTransition>
          </Route>
          <Route path="/step/homemade-pumpkin-bori">
            <PageTransition standalone><HomemadePumpkinBoriPage /></PageTransition>
          </Route>
          <Route path="/step/khejurer-gur/thank-you">
            <PageTransition standalone><KhejurerGurThankYouPage /></PageTransition>
          </Route>
          <Route path="/step/khejurer-gur">
            <PageTransition standalone><KhejurerGurPage /></PageTransition>
          </Route>
          <Route path="/step/am-sotto-achar/thank-you">
            <PageTransition standalone><AmSottoAcharThankYouPage /></PageTransition>
          </Route>
          <Route path="/step/am-sotto-achar">
            <PageTransition standalone><AmSottoAcharPage /></PageTransition>
          </Route>
          <Route path="/">
            <PageTransition>
              <Home />
            </PageTransition>
          </Route>
          <Route path="/products">
            <PageTransition>
              <ProductsPage />
            </PageTransition>
          </Route>
          <Route path="/collection/:slug">
            {(params) => (
              <PageTransition key={params.slug}>
                <CollectionPage params={params} />
              </PageTransition>
            )}
          </Route>
          {Object.values(SITE_PAGES).map((page) => (
            <Route key={page.slug} path={`/${page.slug}`}>
              <PageTransition>
                <SiteInformationPage page={page} />
              </PageTransition>
            </Route>
          ))}
          <Route path="/booking">
            <PageTransition>
              <BookingPage />
            </PageTransition>
          </Route>
          <Route path="/product/:id">
            {(params) => (
              <PageTransition key={params.id}>
                <ProductPage params={params} />
              </PageTransition>
            )}
          </Route>
          <Route>
            <PageTransition standalone>
              <NotFound />
            </PageTransition>
          </Route>
        </Switch>
      </AnimatePresence>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </CartProvider>
    </QueryClientProvider>
  );
}

export default App;
