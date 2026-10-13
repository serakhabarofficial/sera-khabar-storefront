import { Switch, Route, useLocation } from "wouter";
import { AnimatePresence } from "framer-motion";
import { PageTransition } from "@/components/page-transition";
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
import SundarbansHoneyPage from "@/pages/sundarbans-honey";
import SundarbansHoneyThankYouPage from "@/pages/sundarbans-honey-thank-you";
import KalojiraMixedPage from "@/pages/kalojira-mixed";
import KalojiraMixedThankYouPage from "@/pages/kalojira-mixed-thank-you";
import HoneyNutPage from "@/pages/honey-nut";
import HoneyNutThankYouPage from "@/pages/honey-nut-thank-you";
import KatimonMangoPage from "@/pages/katimon-mango";
import HomemadePumpkinBoriPage from "@/pages/homemade-pumpkin-bori";
import { BORI_CAMPAIGN_WHATSAPP_HREF } from "@/features/kalojira-mixed/bori-content";
import CollectionPage from "@/pages/collection";
import SiteInformationPage from "@/pages/site-information";
import { SITE_PAGES } from "@/lib/site-pages";
import { useEffect, useLayoutEffect, useRef } from "react";

const CAMPAIGN_PAGE_TITLES: Record<string, string> = {
  "/step/sundarbans-natural-honey": "সুন্দরবনের প্রাকৃতিক মধু | সেরা খাবার",
  "/step/sundarbans-natural-honey/thank-you": "অর্ডারের জন্য ধন্যবাদ | সেরা খাবার",
  "/step/kalojira-mixed": "কালোজিরা মিক্সড | সেরা খাবার",
  "/step/kalojira-mixed/thank-you": "কালোজিরা মিক্সড অর্ডারের জন্য ধন্যবাদ | সেরা খাবার",
  "/step/honey-nut": "হানি নাট | সেরা খাবার",
  "/step/honey-nut/thank-you": "হানি নাট অর্ডারের জন্য ধন্যবাদ | সেরা খাবার",
  "/step/katimon-mango": "কাটিমন আম | সেরা খাবার",
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
    const targetY = isHistoryNavigation.current && savedY !== undefined ? savedY : 0;
    isHistoryNavigation.current = false;
    currentLocation.current = location;

    // Restore synchronously before paint so the entering page is already at its
    // final scroll position when it fades in — avoids mid-fade scrolling jank.
    window.scrollTo({ top: targetY, left: 0, behavior: "auto" });
  }, [location]);

  return (
    <>
      <CampaignMetadata location={location} />
      <AnimatePresence>
        <Switch location={location} key={location}>
          <Route path="/step/sundarbans-natural-honey/thank-you">
            <PageTransition standalone><SundarbansHoneyThankYouPage /></PageTransition>
          </Route>
          <Route path="/step/sundarbans-natural-honey">
            <PageTransition standalone><SundarbansHoneyPage /></PageTransition>
          </Route>
          <Route path="/step/kalojira-mixed/thank-you">
            <PageTransition standalone><KalojiraMixedThankYouPage /></PageTransition>
          </Route>
          <Route path="/step/kalojira-mixed">
            <PageTransition standalone><KalojiraMixedPage /></PageTransition>
          </Route>
          <Route path="/step/honey-nut/thank-you">
            <PageTransition standalone><HoneyNutThankYouPage /></PageTransition>
          </Route>
          <Route path="/step/honey-nut">
            <PageTransition standalone><HoneyNutPage /></PageTransition>
          </Route>
          <Route path="/step/katimon-mango">
            <PageTransition standalone><KatimonMangoPage /></PageTransition>
          </Route>
          <Route path="/step/homemade-pumpkin-bori/thank-you">
            <PageTransition standalone><KalojiraMixedThankYouPage backHref="/step/homemade-pumpkin-bori" backLabel="কুমড়ো বড়ি অর্ডার পেজে ফিরে যান" whatsappHref={BORI_CAMPAIGN_WHATSAPP_HREF} /></PageTransition>
          </Route>
          <Route path="/step/homemade-pumpkin-bori">
            <PageTransition standalone><HomemadePumpkinBoriPage /></PageTransition>
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
