import "../paper-clip.css";

// Steel gem clip standing on the middle of a memo's top edge (approved 2026-10-19, docs/design/2026-10-19-memo-fastener/).
// Render layer="back" before the paper and layer="front" after it: the inner tongue goes behind the sheet and the big
// loop lies over it. Drawn in a 28×76 box with the paper's edge at y=14.
const PATHS = {
  back: "M10 52 V14 A5 5 0 0 1 20 14",
  front: "M20 14 V66 A8 8 0 0 1 4 66 V10 A10 10 0 0 1 24 10 V56",
} as const;

export function PaperClip({ layer }: { layer: "back" | "front" }) {
  const d = PATHS[layer];
  const back = layer === "back";
  return (
    <svg className={`paper-clip paper-clip-${layer}`} viewBox="0 0 28 76" aria-hidden="true" focusable="false">
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d={d} stroke={back ? "#5d6268" : "#6b7077"} strokeWidth="2.5" />
        <path d={d} stroke={back ? "#a7abb1" : "#c9cdd2"} strokeWidth="1.6" />
        <path d={d} stroke="#ffffff" strokeWidth=".55" opacity={back ? 0.55 : 0.9} transform="translate(-.35 -.4)" />
      </g>
    </svg>
  );
}
