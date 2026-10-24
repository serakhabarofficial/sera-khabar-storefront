import { useEffect, useRef } from "react";
import {
  createAbandonedCartCapture,
  type AbandonedCartCapture,
  type AbandonedCartSource,
} from "@/lib/abandoned-cart-capture";

function getSessionStorage() {
  if (typeof window === "undefined") return undefined;
  try {
    return window.sessionStorage;
  } catch {
    return undefined;
  }
}

export function useAbandonedCartCapture(source: AbandonedCartSource, draftScope?: string, sourcePath?: string, options: { partialContact?: boolean } = {}): AbandonedCartCapture {
  const captureRef = useRef<AbandonedCartCapture | null>(null);
  if (!captureRef.current) {
    captureRef.current = createAbandonedCartCapture({ source, draftScope, sourcePath, partialContact: options.partialContact, storage: getSessionStorage() });
  }
  const capture = captureRef.current;

  useEffect(() => {
    const retry = () => capture.retry();
    // Closing the tab or switching apps sends the last edit instead of waiting for the debounce.
    const flush = () => capture.flushPending();
    const flushWhenHidden = () => { if (document.visibilityState === "hidden") flush(); };
    window.addEventListener("focus", retry);
    window.addEventListener("online", retry);
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", flushWhenHidden);
    return () => {
      window.removeEventListener("focus", retry);
      window.removeEventListener("online", retry);
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", flushWhenHidden);
      void capture.finalize();
      capture.dispose();
    };
  }, [capture]);

  return capture;
}
