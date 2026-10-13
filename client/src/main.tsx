import { createRoot } from "react-dom/client";
import { MotionConfig } from "framer-motion";
import App from "./App";
import "./index.css";
import { getMerchantSuiteTrackerUrl, PRODUCTION_MERCHANT_SUITE_URL } from "./lib/tracker";

// The build puts the Merchant Suite visitor tracker in the HTML head (see
// vite-plugin-merchant-suite-tracker.ts). This is only a fallback for HTML
// served without it; the element id keeps the tracker from loading twice.
const TRACKER_SUITE = import.meta.env.PROD
  ? PRODUCTION_MERCHANT_SUITE_URL
  : import.meta.env.VITE_MERCHANT_SUITE_URL;
const TRACKER_ORG = import.meta.env.VITE_STOREFRONT_ID;
const trackerUrl = getMerchantSuiteTrackerUrl(TRACKER_SUITE, TRACKER_ORG);
if (trackerUrl && !document.getElementById("merchant-suite-tracker")) {
  const t = document.createElement("script");
  t.id = "merchant-suite-tracker";
  t.async = true;
  t.src = trackerUrl;
  document.body.appendChild(t);
}

createRoot(document.getElementById("root")!).render(
  <MotionConfig reducedMotion="user">
    <App />
  </MotionConfig>,
);
