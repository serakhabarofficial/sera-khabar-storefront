import { motion } from "framer-motion";

export type BoriCookingStep = { title: string; body: string; image: string; imageAlt: string };

type Spot = {
  center: [number, number];
  rays: { color: string; from: number; to: number };
  label: string;
  labelArc: string;
  sparkle: { at: [number, number]; scale: number; color: string };
  numeral: string;
  text: { left: string; top: string; width: string; align: "left" | "right" | "center" };
};

type PathLayout = {
  viewW: number;
  viewH: number;
  photoSize: string;
  pathD: string;
  strokeWidth: number;
  ray: { inner: number; outer: number; width: number };
  labelSize: number;
  spots: Spot[];
};

const SPARKLE_D = "M0 -16 C2 -4 4 -2 16 0 C4 2 2 4 0 16 C-2 4 -4 2 -16 0 C-4 -2 -2 -4 0 -16Z";

// Geometry is in viewBox units, tuned from approved mockups. Photo and text positions are percentages of the box so the layout scales with width.
const MOBILE_LAYOUT: PathLayout = {
  viewW: 400,
  viewH: 1040,
  photoSize: "46%",
  pathD: "M 230 0 C 230 70 150 40 120 170 C 95 290 150 360 250 360 C 360 360 350 285 300 320 C 250 360 250 430 280 540 C 310 660 170 640 110 700 C 50 760 60 820 120 900 C 190 925 200 990 195 1040",
  strokeWidth: 9,
  ray: { inner: 106, outer: 134, width: 7 },
  labelSize: 15,
  spots: [
    { center: [110, 175], rays: { color: "#eab308", from: 165, to: 295 }, label: "ভাজুন •", labelArc: "M 7.8 234 A 118 118 0 0 0 212.2 234", sparkle: { at: [190, 70], scale: 1.1, color: "#19382d" }, numeral: "০১", text: { left: "57%", top: "7.54%", width: "40%", align: "left" } },
    { center: [288, 525], rays: { color: "#f28c28", from: -75, to: 15 }, label: "মেশান •", labelArc: "M 185.8 584 A 118 118 0 0 0 390.2 584", sparkle: { at: [385, 405], scale: 1.3, color: "#2f9e5b" }, numeral: "০২", text: { left: "3%", top: "42%", width: "44%", align: "right" } },
    { center: [112, 874], rays: { color: "#2f9e5b", from: 165, to: 295 }, label: "পরিবেশন •", labelArc: "M 9.8 933 A 118 118 0 0 0 214.2 933", sparkle: { at: [222, 770], scale: 1, color: "#f28c28" }, numeral: "০৩", text: { left: "57%", top: "76.46%", width: "40%", align: "left" } },
  ],
};

const DESKTOP_LAYOUT: PathLayout = {
  viewW: 1200,
  viewH: 640,
  photoSize: "20%",
  pathD: "M 0 40 C 70 20 130 110 200 170 C 280 240 300 330 400 380 C 470 415 530 360 500 320 C 470 280 420 330 480 380 C 540 430 560 440 600 440 C 700 440 720 340 800 300 C 880 260 930 200 1000 170 C 1080 135 1150 60 1200 30",
  strokeWidth: 10,
  ray: { inner: 136, outer: 170, width: 8 },
  labelSize: 17,
  spots: [
    { center: [200, 170], rays: { color: "#eab308", from: 110, to: 215 }, label: "ভাজুন •", labelArc: "M 116.8 51.2 A 145 145 0 0 1 340.1 132.5", sparkle: { at: [330, 60], scale: 1.3, color: "#19382d" }, numeral: "০১", text: { left: "16.667%", top: "55%", width: "26%", align: "center" } },
    { center: [600, 440], rays: { color: "#f28c28", from: 40, to: 140 }, label: "মেশান •", labelArc: "M 463.7 390.4 A 145 145 0 0 1 736.3 390.4", sparkle: { at: [775, 540], scale: 1.5, color: "#2f9e5b" }, numeral: "০২", text: { left: "50%", top: "0%", width: "26%", align: "center" } },
    { center: [1000, 170], rays: { color: "#2f9e5b", from: -10, to: 70 }, label: "পরিবেশন •", labelArc: "M 859.9 132.5 A 145 145 0 0 1 1083.2 51.2", sparkle: { at: [860, 60], scale: 1.2, color: "#f28c28" }, numeral: "০৩", text: { left: "83.333%", top: "55%", width: "26%", align: "center" } },
  ],
};

const TEXT_ALIGN = { left: "text-left", right: "text-right", center: "-translate-x-1/2 text-center" } as const;

function rayLines(from: number, to: number, inner: number, outer: number, count = 16) {
  return Array.from({ length: count }, (_, i) => {
    const angle = ((from + ((to - from) * i) / (count - 1)) * Math.PI) / 180;
    return { x1: Math.cos(angle) * inner, y1: Math.sin(angle) * inner, x2: Math.cos(angle) * outer, y2: Math.sin(angle) * outer };
  });
}

function CookingPath({ layout, steps, idPrefix, large, className }: { layout: PathLayout; steps: BoriCookingStep[]; idPrefix: string; large: boolean; className: string }) {
  return <ol className={`relative w-full ${className}`} style={{ aspectRatio: `${layout.viewW} / ${layout.viewH}` }}>
    <svg aria-hidden="true" viewBox={`0 0 ${layout.viewW} ${layout.viewH}`} className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
      <defs>{layout.spots.map((spot, idx) => <path key={spot.label} id={`${idPrefix}-arc-${idx}`} d={spot.labelArc} />)}</defs>
      {layout.spots.map((spot) => <g key={spot.label} transform={`translate(${spot.center[0]} ${spot.center[1]})`} stroke={spot.rays.color} strokeWidth={layout.ray.width} strokeLinecap="round">{rayLines(spot.rays.from, spot.rays.to, layout.ray.inner, layout.ray.outer).map((line, i) => <line key={i} {...line} />)}</g>)}
      <motion.path d={layout.pathD} fill="none" stroke="#eab308" strokeWidth={layout.strokeWidth} strokeLinecap="round" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 2.2, ease: "easeInOut" }} />
      {layout.spots.map((spot) => <path key={spot.label} d={SPARKLE_D} fill={spot.sparkle.color} transform={`translate(${spot.sparkle.at[0]} ${spot.sparkle.at[1]}) scale(${spot.sparkle.scale})`} />)}
      {layout.spots.map((spot, idx) => <text key={spot.label} fontSize={layout.labelSize} fontWeight={700} fill="#b98500" letterSpacing={0.5}><textPath href={`#${idPrefix}-arc-${idx}`} startOffset="50%" textAnchor="middle">{spot.label}</textPath></text>)}
    </svg>
    {steps.map((step, idx) => {
      const spot = layout.spots[idx];
      if (!spot) return null;
      return <li key={step.title}>
        <motion.div initial={{ opacity: 0, scale: 0.85 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }} className={`absolute aspect-square -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full bg-white shadow-[0_10px_30px_-12px_rgba(25,56,45,0.45)] ${large ? "border-[5px] border-white" : "border-4 border-white"}`} style={{ left: `${(spot.center[0] / layout.viewW) * 100}%`, top: `${(spot.center[1] / layout.viewH) * 100}%`, width: layout.photoSize }}>
          <img src={step.image} alt={step.imageAlt} loading="lazy" decoding="async" className="h-full w-full object-cover object-center" />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.6, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }} className={`absolute ${TEXT_ALIGN[spot.text.align]}`} style={{ left: spot.text.left, top: spot.text.top, width: spot.text.width }}>
          <p aria-hidden="true" className={`font-black leading-none text-[#19382d] ${large ? "text-5xl" : "text-[40px]"}`}>{spot.numeral}</p>
          <h3 className={`font-bold leading-tight text-[#19382d] ${large ? "mt-2 text-2xl" : "mt-1.5 text-[19px]"}`}>{step.title}</h3>
          <p className={`text-[#19382d]/70 ${large ? "mt-2 text-base leading-7" : "mt-1.5 text-sm leading-6"}`}>{step.body}</p>
        </motion.div>
      </li>;
    })}
  </ol>;
}

export function BoriCookingPath({ steps }: { steps: BoriCookingStep[] }) {
  return <>
    <CookingPath layout={MOBILE_LAYOUT} steps={steps} idPrefix="bori-cook-m" large={false} className="mx-auto max-w-[480px] lg:hidden" />
    <CookingPath layout={DESKTOP_LAYOUT} steps={steps} idPrefix="bori-cook-d" large className="hidden lg:block" />
  </>;
}
