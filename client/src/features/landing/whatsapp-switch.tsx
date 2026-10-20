import { useRef, useState, type MouseEvent } from "react";
import { motion, useAnimationControls, useMotionValue, useMotionValueEvent, useReducedMotion } from "framer-motion";

import { WhatsAppBrandIcon } from "./campaign-layout";

const SLIDE = { type: "spring", stiffness: 420, damping: 34 } as const;

export function WhatsAppSwitch({ href, label }: { href: string; label: string }) {
  const trackRef = useRef<HTMLAnchorElement>(null);
  const dragged = useRef(false);
  const busy = useRef(false);
  const [on, setOn] = useState(false);
  const x = useMotionValue(0);
  const controls = useAnimationControls();
  const reduceMotion = useReducedMotion();
  const transition = reduceMotion ? { duration: 0 } : SLIDE;

  // Knob is a square inset 1px inside the track, so it travels width - height.
  const travel = () => {
    const track = trackRef.current;
    return track ? track.clientWidth - track.clientHeight : 30;
  };

  useMotionValueEvent(x, "change", (value) => setOn(value > travel() / 2));

  const openWhatsApp = async () => {
    if (busy.current) return;
    busy.current = true;
    await controls.start({ x: travel(), transition });
    const opened = window.open(href, "_blank");
    if (opened) opened.opener = null;
    else window.location.href = href;
    window.setTimeout(() => {
      void controls.start({ x: 0, transition }).then(() => { busy.current = false; });
    }, 700);
  };

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (dragged.current) return;
    void openWhatsApp();
  };

  return (
    <a
      ref={trackRef}
      href={href}
      aria-label={label}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      draggable={false}
      className={`relative inline-block h-10 w-[70px] shrink-0 cursor-pointer rounded-[30px] border transition-colors duration-300 md:h-11 md:w-[78px] ${on ? "border-transparent bg-[#5fdd54]" : "border-[#ccc] bg-white"}`}
    >
      <motion.span
        aria-hidden="true"
        drag="x"
        dragConstraints={trackRef}
        dragElastic={0}
        dragMomentum={false}
        style={{ x }}
        animate={controls}
        onDragStart={() => { dragged.current = true; }}
        onDragEnd={() => {
          // The click that follows a drag's pointerup must not re-trigger.
          window.setTimeout(() => { dragged.current = false; }, 0);
          if (x.get() > travel() / 2) void openWhatsApp();
          else void controls.start({ x: 0, transition });
        }}
        className="absolute inset-y-px left-px flex aspect-square touch-none items-center justify-center rounded-full bg-white text-[#25b33a] shadow-[0_2px_5px_#999999]"
      >
        <WhatsAppBrandIcon className="size-[18px]" />
      </motion.span>
    </a>
  );
}
