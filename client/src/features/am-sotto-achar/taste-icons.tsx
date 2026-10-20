// Taste badge art, drawn from a few pose values so the same drawing serves both the still fallback
// (REST, shown before the player loads and for reduced motion) and every Remotion frame. No Remotion
// import here, so the stills stay in the page bundle and the player loads lazily.
export type TasteIcon = "sour" | "chili" | "sweet";
export type Pose = { squeeze: number; sway: number; waves: number[]; sparkles: number[] };
export const REST: Record<TasteIcon, Pose> = {
  sour: { squeeze: 1, sway: 0, waves: [], sparkles: [] },
  chili: { squeeze: 0, sway: 0, waves: [0.25, 0.55, 0.85], sparkles: [] },
  sweet: { squeeze: 0, sway: 0, waves: [], sparkles: [1, 0.55, 0.8] },
};

function Sour({ ink, p }: { ink: string; p: Pose }) {
  const s = p.squeeze, open = Math.max(0, 1 - s);
  return <g transform={`rotate(${p.sway} 24 24) translate(24 24) scale(${1 - 0.06 * s} ${1 + 0.05 * s}) translate(-24 -24)`}>
    <circle cx="24" cy="24" r="19" fill="#f5c518" stroke={ink} strokeWidth="2.5" />
    <g fill={ink} opacity={open}><ellipse cx="17" cy="21" rx="2.6" ry={3.2 * open + 0.2} /><ellipse cx="31" cy="21" rx="2.6" ry={3.2 * open + 0.2} /></g>
    <path d="M13 19l6 3-6 3M35 19l-6 3 6 3" fill="none" stroke={ink} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" opacity={Math.min(1, s)} />
    <ellipse cx="24" cy="33" rx={6 - 2.8 * s} ry={2.4 + 1.4 * s} fill={ink} />
    {/* zing lines spring out at the peak of the pucker */}
    <g stroke={ink} strokeWidth="2.4" strokeLinecap="round" opacity={Math.min(1, s)}>
      <path d={`M${41 + 2 * s} ${9 - 2 * s}l3 -3`} /><path d={`M${44 + 2 * s} ${16}l4 0`} /><path d={`M${7 - 2 * s} ${9 - 2 * s}l-3 -3`} />
    </g>
  </g>;
}

function Chili({ ink, p }: { ink: string; p: Pose }) {
  return <g>
    {p.waves.map((t, i) => <path key={i} d={`M${7 + i * 7} ${19 - 12 * t}c-2 -2 2 -4 0 -6s2 -4 0 -6`} fill="none" stroke="#e5381c" strokeWidth="2" strokeLinecap="round" opacity={Math.sin(Math.PI * t) * 0.85} />)}
    <g transform={`rotate(${p.sway} 33 9)`}>
      <path d="M31 13c-2-4 1-7 4-8" fill="none" stroke="#2f6b3a" strokeWidth="3" strokeLinecap="round" />
      <path d="M27 13c6-2 11 3 9 9-3 10-13 19-27 20-2 0-2-2 0-3 9-4 13-11 13-18 0-4 2-7 5-8z" fill="#e5381c" stroke={ink} strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M29 18c2 0 4 2 3 5" fill="none" stroke="#fff" strokeOpacity=".6" strokeWidth="2.2" strokeLinecap="round" />
    </g>
  </g>;
}

const SPARKLES: [number, number, number][] = [[9, 9, 4], [41, 10, 3], [39, 40, 3.5]];
function Sweet({ ink, p }: { ink: string; p: Pose }) {
  const twist = 1 - 0.18 * p.squeeze;
  return <g>
    {SPARKLES.map(([x, y, r], i) => { const k = p.sparkles[i] ?? 0; return <path key={i} transform={`translate(${x} ${y}) scale(${k})`} d={`M0 ${-r}Q0 0 ${r} 0Q0 0 0 ${r}Q0 0 ${-r} 0Q0 0 0 ${-r}z`} fill="#f5c518" stroke={ink} strokeWidth="1" strokeLinejoin="round" />; })}
    <g transform={`rotate(${-18 + p.sway} 24 25)`}>
      <path transform={`translate(13 25) scale(1 ${twist}) translate(-13 -25)`} d="M13 25 2 15v20z" fill="#ffb3c7" stroke={ink} strokeWidth="2.2" strokeLinejoin="round" />
      <path transform={`translate(35 25) scale(1 ${2 - twist}) translate(-35 -25)`} d="M35 25l11-10v20z" fill="#ffb3c7" stroke={ink} strokeWidth="2.2" strokeLinejoin="round" />
      <circle cx="24" cy="25" r="12.5" fill="#ff7aa2" stroke={ink} strokeWidth="2.4" />
      <path d="M16.5 19c3 4 3 9 0 12.5M24 13.5c3.4 5 3.4 18 0 23M31.5 18.5c3 4 3 9.5 0 13" fill="none" stroke="#fff" strokeOpacity=".8" strokeWidth="2.2" strokeLinecap="round" />
    </g>
  </g>;
}

const ART = { sour: Sour, chili: Chili, sweet: Sweet };
export function TasteArt({ icon, ink, pose = REST[icon] }: { icon: TasteIcon; ink: string; pose?: Pose }) {
  const Art = ART[icon];
  return <svg viewBox="0 0 48 48" width="100%" height="100%" overflow="visible" aria-hidden="true"><Art ink={ink} p={pose} /></svg>;
}
