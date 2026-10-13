import { AnimatePresence, usePresence, useReducedMotion } from "framer-motion";
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { getLoadMotion, getPageMotion, PAGE_EASE, takeRouteScroll } from "@/lib/page-motion";
import { startScrollReveal } from "@/lib/scroll-reveal";
import { startSkewReveal } from "@/lib/skew-reveal";

// Only the very first page after a refresh plays the load animation; later pages use Settle.
let hasShownFirstPage = false;

function play(element: Element | null, keyframes: Keyframe[], options: KeyframeAnimationOptions) {
  if (!element || typeof element.animate !== "function") return null;
  const animation = element.animate(keyframes, { fill: "both", easing: PAGE_EASE, ...options });
  // Every entrance ends on the element's resting style, so release the fill when it finishes.
  animation.onfinish = () => animation.cancel();
  return animation;
}

// Grow from the photo's resting transform (the homepage photo is tilted), not from none.
function settleKeyframes(element: Element, scale: number, fadeIn: boolean): Keyframe[] {
  const rest = getComputedStyle(element).transform;
  const from: Keyframe = { transform: `${rest === "none" ? "" : `${rest} `}scale(${scale})` };
  const to: Keyframe = { transform: rest };
  if (fadeIn) {
    from.opacity = 0;
    to.opacity = 1;
  }
  return [from, to];
}

export function PageTransition({ children, standalone = false }: { children: ReactNode; standalone?: boolean }) {
  const [isPresent, safeToRemove] = usePresence();
  const reducedMotion = Boolean(useReducedMotion());
  const ref = useRef<HTMLDivElement>(null);
  const entrance = useRef<(Animation | null)[]>([]);

  // Pages with the shared Layout fade only their content, so the header and dock stay still.
  // Standalone campaign pages have no shared header and fade as a whole.
  const fadingPart = (root: HTMLElement) => (standalone ? root : root.querySelector<HTMLElement>("[data-page-content]") ?? root);

  // Entrance, before the new page's first paint.
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const firstPage = !hasShownFirstPage;
    hasShownFirstPage = true;

    // The outgoing page has already faded out, so this jump is never seen.
    const route = takeRouteScroll();
    if (route) window.scrollTo({ top: route.top, left: 0, behavior: "auto" });
    const back = route?.back ?? false;
    const stopReveal = startScrollReveal(root, { instantInView: back });
    const stopSkewReveal = startSkewReveal(root, { instantInView: back });

    const photo = root.querySelector("[data-page-settle]");
    const animations: (Animation | null)[] = [];
    if (firstPage) {
      const load = getLoadMotion(reducedMotion);
      const steps = Array.from(root.querySelectorAll("[data-load-step]"));
      if (photo) {
        animations.push(load.photo
          ? play(photo, settleKeyframes(photo, load.photo.scale, true), { duration: load.photo.duration })
          : play(photo, [{ opacity: 0 }, { opacity: 1 }], { duration: load.steps.duration }));
      }
      animations.push(play(root.querySelector("[data-page-header]"), [{ opacity: 0 }, { opacity: 1 }], { duration: load.header.duration }));
      if (steps.length) {
        steps.forEach((step, index) => animations.push(play(step, [{ opacity: 0 }, { opacity: 1 }], {
          duration: load.steps.duration,
          delay: load.steps.delay + index * load.steps.gap,
        })));
      } else if (!photo) {
        animations.push(play(fadingPart(root), [{ opacity: 0 }, { opacity: 1 }], { duration: load.steps.duration }));
      }
    } else {
      const motion = getPageMotion(reducedMotion, back);
      animations.push(play(fadingPart(root), [{ opacity: 0 }, { opacity: 1 }], { duration: motion.enter.duration }));
      if (photo && motion.settle) {
        animations.push(play(photo, settleKeyframes(photo, motion.settle.scale, false), { duration: motion.settle.duration }));
      }
    }
    entrance.current = animations;

    return () => {
      stopReveal();
      stopSkewReveal();
      animations.forEach((animation) => animation?.cancel());
    };
    // Runs once per page: each route change mounts a fresh PageTransition.
  }, []);

  // Exit: fade the old content out; AnimatePresence (mode="wait") mounts the next page afterwards.
  useLayoutEffect(() => {
    if (isPresent) return;
    const root = ref.current;
    const part = root ? fadingPart(root) : null;
    if (!part || typeof part.animate !== "function") {
      safeToRemove?.();
      return;
    }
    // Leaving mid-entrance starts from the frame on screen, not from fully visible.
    const from = getComputedStyle(part).opacity;
    entrance.current.forEach((animation) => animation?.cancel());
    const exit = part.animate([{ opacity: from }, { opacity: 0 }], {
      duration: getPageMotion(reducedMotion).exit.duration,
      easing: PAGE_EASE,
      fill: "forwards",
    });
    exit.onfinish = () => safeToRemove?.();
    return () => exit.cancel();
  }, [isPresent]);

  return (
    <div
      ref={ref}
      data-page-transition=""
      data-page-presence={isPresent ? "present" : "exiting"}
      inert={!isPresent}
      aria-hidden={!isPresent || undefined}
    >
      {/* Keep drawers, dock highlights and other local motion from joining the outgoing
          route's exit barrier as their location changes. */}
      <AnimatePresence>{children}</AnimatePresence>
    </div>
  );
}

// Marks the part of a Layout page that fades between routes; the header and dock stay put.
export function PageContentTransition({ children }: { children: ReactNode }) {
  return <div data-page-content="">{children}</div>;
}
