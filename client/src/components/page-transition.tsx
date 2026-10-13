import { AnimatePresence, usePresence, useReducedMotion } from "framer-motion";
import { createContext, useContext, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { getPageMotion, getPageTransformOrigin } from "@/lib/page-motion";

const PagePresenceContext = createContext(true);

function useNativePageMotion(
  ref: RefObject<HTMLDivElement | null>,
  isPresent: boolean,
  reducedMotion: boolean,
  depth: boolean,
  contentOnly = false,
  onExitComplete?: () => void,
) {
  const exitComplete = useRef(onExitComplete);
  exitComplete.current = onExitComplete;

  useLayoutEffect(() => {
    let cancelled = false;
    let animation: Animation | undefined;
    // Router's parent layout effect restores scroll before this microtask. Read
    // the untransformed parent, not the animated element's projected bounds.
    queueMicrotask(() => {
      const element = ref.current;
      if (cancelled || !element) return;
      const moves = depth && !reducedMotion;
      if (moves && element.parentElement) {
        element.style.transformOrigin = getPageTransformOrigin(
          element.parentElement.getBoundingClientRect().top,
          window.innerHeight,
        );
      }

      const config = getPageMotion(reducedMotion, depth);
      const current = getComputedStyle(element);
      const from: Keyframe = {};
      const to: Keyframe = {};
      if (!contentOnly) {
        from.opacity = isPresent ? 0 : Number(current.opacity);
        to.opacity = isPresent ? 1 : 0;
      }
      if (moves) {
        from.transform = isPresent ? config.initial.transform : current.transform;
        to.transform = isPresent ? config.animate.transform : config.exit.transform[1];
      }

      const finish = () => {
        // Set the underlying final styles BEFORE releasing the native animation.
        // Otherwise cancellation can expose a hidden starting style for a frame.
        if (!contentOnly) element.style.opacity = isPresent ? "1" : "0";
        if (depth) element.style.transform = isPresent || reducedMotion ? "none" : "translateY(0px) scale(0.985)";
        animation?.cancel();
        if (!isPresent) exitComplete.current?.();
      };

      if ((contentOnly && !moves) || typeof element.animate !== "function") {
        finish();
        return;
      }
      const transition = isPresent ? config.animate.transition : config.exit.transition;
      animation = element.animate([from, to], {
        duration: transition.duration * 1000,
        easing: `cubic-bezier(${transition.ease.join(",")})`,
        fill: "both",
      });
      animation.onfinish = () => { if (!cancelled) finish(); };
    });

    return () => {
      cancelled = true;
      // Preserve the current frame if rapid navigation interrupts an entrance.
      const element = ref.current;
      if (animation && element) {
        const current = getComputedStyle(element);
        if (!contentOnly) element.style.opacity = current.opacity;
        if (depth && !reducedMotion) element.style.transform = current.transform;
      }
      animation?.cancel();
    };
  }, [ref, isPresent, reducedMotion, depth, contentOnly]);
}

export function PageTransition({ children, standalone = false }: { children: ReactNode; standalone?: boolean }) {
  const [isPresent, safeToRemove] = usePresence();
  const reducedMotion = Boolean(useReducedMotion());
  const ref = useRef<HTMLDivElement>(null);
  const [exitStyle, setExitStyle] = useState<CSSProperties>();
  useNativePageMotion(ref, isPresent, reducedMotion, standalone, false, safeToRemove ?? undefined);

  useLayoutEffect(() => {
    if (!isPresent && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setExitStyle({ position: "fixed", top: rect.top, left: rect.left, width: rect.width, zIndex: 0, pointerEvents: "none" });
    }
  }, [isPresent]);

  return (
    <div
      ref={ref}
      data-page-transition=""
      data-page-presence={isPresent ? "present" : "exiting"}
      inert={!isPresent}
      aria-hidden={!isPresent || undefined}
      style={isPresent ? { position: "relative", zIndex: 1, opacity: 1 } : exitStyle}
    >
      <PagePresenceContext.Provider value={isPresent}>
        {/* Keep new dock highlights, drawers and other local motion from joining
            the outgoing route's exit barrier as their location changes. */}
        <AnimatePresence>{children}</AnimatePresence>
      </PagePresenceContext.Provider>
    </div>
  );
}

export function PageContentTransition({ children }: { children: ReactNode }) {
  const isPresent = useContext(PagePresenceContext);
  const reducedMotion = Boolean(useReducedMotion());
  const ref = useRef<HTMLDivElement>(null);
  useNativePageMotion(ref, isPresent, reducedMotion, true, true);

  return (
    <div
      ref={ref}
      data-page-content=""
      style={{ transform: "none" }}
    >
      {children}
    </div>
  );
}
