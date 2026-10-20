import { useId } from "react";

// "Plate" taste badges (approved 2026-10-20): a ripe mango with a hedgehog-cut cheek (টক), a glossy
// chilli (ঝাল) and a cake of patali gur (মিষ্টি), each resting on a small clay plate (মাটির সরা).
// Every drawing is a pure function of the frame, so the same art serves the still fallback (REST_FRAME,
// shown before the player loads and for reduced motion) and every Remotion frame. No Remotion import
// here, so the stills stay in the page bundle and the player loads lazily.
export type TasteIcon = "sour" | "chili" | "sweet";
export const LOOP = 120;
export const REST_FRAME = 0;

const W = (f: number, p: number, ph = 0) => Math.sin(2 * Math.PI * (f / p + ph));
const cl = (x: number) => Math.max(0, Math.min(1, x));
const eio = (t: number) => { t = cl(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const eo = (t: number) => 1 - Math.pow(1 - cl(t), 3);
const cyc = (f: number, p: number, off = 0) => ((((f + off) % p) + p) % p) / p;
type Art = { f: number; id: string };

/** Blur for highlights, the contact shadow and the glint gradient, shared by every object. */
function Kit({ id }: { id: string }) {
  return <>
    <filter id={`${id}b`} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.4" /></filter>
    <filter id={`${id}s`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3.2" /></filter>
    <filter id={`${id}g`} x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="1.1" /></filter>
    <linearGradient id={`${id}w`} x1="0" x2="1"><stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset=".5" stopColor="#fff" stopOpacity=".75" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
  </>;
}

/** A band of light that sweeps across the object once per loop (frames 18–46), clipped to its outline. */
function Glint({ id, body, f }: Art & { body: string }) {
  const t = eio((f - 18) / 28);
  if (t <= 0 || t >= 1) return null;
  return <><clipPath id={`${id}c`}><path d={body} /></clipPath><g clipPath={`url(#${id}c)`}><rect x={-30 + 150 * t} y="-20" width="16" height="150" fill={`url(#${id}w)`} transform="rotate(22 50 50)" /></g></>;
}

const Shadow = ({ id, y, rx }: { id: string; y: number; rx: number }) => <ellipse cx="50" cy={y} rx={rx} ry="4.5" fill="#3f1a0b" opacity=".3" filter={`url(#${id}s)`} />;
const Drop = ({ fill }: { fill: string }) => <><path d="M0-6C3.6-1 4.4 2.4 0 4.4C-4.4 2.4-3.6-1 0-6z" fill={fill} /><circle cx="-1.2" cy="0" r="1" fill="#fff" opacity=".9" /></>;

// Mango silhouette: round shoulder, long body, a hooked tip with a notch beside it, stem and hanging leaf.
const MANGO = "M52 14C68 13 78 26 78 44C78 62 70 80 56 88C50 91 42 92 38 89C36 87 37 84 39 83C35 80 30 74 28 66C24 50 26 28 38 19C42 16 47 14 52 14z";
const CHEEK = "M48 74C50 62 66 54 82 58C94 61 95 75 86 82C74 90 54 88 48 74z";
function Mango({ f, id }: Art) {
  // Taste moment: a juice drop swells on the cut cheek and falls (frames 62–112).
  const grow = eo((f - 62) / 16), fall = cl((f - 82) / 26);
  return <>
    <defs>
      <radialGradient id={`${id}m`} cx=".34" cy=".28" r=".85"><stop offset="0" stopColor="#fff2a0" /><stop offset=".3" stopColor="#ffd23a" /><stop offset=".7" stopColor="#f7a21b" /><stop offset="1" stopColor="#d0620c" /></radialGradient>
      <radialGradient id={`${id}r`} cx=".85" cy=".2" r=".5"><stop offset="0" stopColor="#e8541a" stopOpacity=".45" /><stop offset="1" stopColor="#e8541a" stopOpacity="0" /></radialGradient>
      <radialGradient id={`${id}ch`} cx=".4" cy=".35" r=".75"><stop offset="0" stopColor="#ffe27a" /><stop offset=".6" stopColor="#ffbf2e" /><stop offset="1" stopColor="#ef9410" /></radialGradient>
      <linearGradient id={`${id}l`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#8fd35b" /><stop offset="1" stopColor="#2c7a2a" /></linearGradient>
      <linearGradient id={`${id}d`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffe680" /><stop offset="1" stopColor="#f29a00" /></linearGradient>
      <clipPath id={`${id}k`}><path d={CHEEK} /></clipPath>
    </defs>
    <Shadow id={id} y={90} rx={36} />
    <g transform="translate(-4 12) scale(.8) rotate(8 52 88)">
      <path d="M54 15C55 10 57 7 60 5" fill="none" stroke="#6b4a1f" strokeWidth="3.2" strokeLinecap="round" />
      <path d={MANGO} fill={`url(#${id}m)`} />
      <path d={MANGO} fill={`url(#${id}r)`} />
      <path d="M37 30C32 42 32 56 38 66" fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth="3.4" strokeLinecap="round" filter={`url(#${id}b)`} />
      <circle cx="44" cy="24" r="1.8" fill="#fff" opacity=".9" />
      <Glint id={id} body={MANGO} f={f} />
      <path d="M57 11C72 10 86 26 83 50C76 36 66 25 57 11z" fill={`url(#${id}l)`} />
      <path d="M58 12C68 22 76 34 82 47" fill="none" stroke="#1d5a1b" strokeOpacity=".55" strokeWidth="1.2" strokeLinecap="round" />
    </g>
    <g transform="translate(64 82) scale(.6) translate(-71 -72)">
      <path d="M48 74C50 62 66 54 82 58C94 61 95 75 86 82" fill="none" stroke="#c96a12" strokeWidth="3.4" strokeLinecap="round" />
      <path d={CHEEK} fill={`url(#${id}ch)`} />
      <g clipPath={`url(#${id}k)`} stroke="#e08a12" strokeWidth="1.6" strokeOpacity=".75">{[0, 1, 2, 3, 4, 5].map((k) => <path key={k} d={`M${36 + k * 9} 50l26 44M${92 - k * 9} 50l-26 44`} />)}</g>
      <path d="M56 66C62 61 70 59 78 60" fill="none" stroke="#fff" strokeOpacity=".75" strokeWidth="2" strokeLinecap="round" filter={`url(#${id}g)`} />
    </g>
    {f > 62 && fall < 1 && <g transform={`translate(${66 - fall} ${90 + 16 * fall * fall}) scale(${0.4 + 0.6 * grow})`} opacity={1 - fall * fall}><Drop fill={`url(#${id}d)`} /></g>}
  </>;
}

const CHILI = "M58 26C70 22 80 32 76 46C70 66 48 84 20 86C15 86 14 81 19 79C38 71 47 57 47 42C47 34 51 28 58 26z";
function Chili({ f, id }: Art) {
  // Taste moment: a short shiver (frames 40–60) while warm sparks rise all loop long.
  const shiver = Math.sin(f * 2.4) * 2.6 * Math.sin(Math.PI * cl((f - 40) / 20));
  return <>
    <defs>
      <linearGradient id={`${id}r`} x1=".25" y1=".05" x2=".85" y2=".95"><stop offset="0" stopColor="#ff6b4a" /><stop offset=".45" stopColor="#e02a15" /><stop offset="1" stopColor="#8e1409" /></linearGradient>
      <radialGradient id={`${id}h`} cx=".7" cy=".3" r=".5"><stop offset="0" stopColor="#ff9a7a" stopOpacity=".8" /><stop offset="1" stopColor="#ff9a7a" stopOpacity="0" /></radialGradient>
      <linearGradient id={`${id}k`} x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#3d6b1e" /><stop offset="1" stopColor="#8fbf4a" /></linearGradient>
    </defs>
    <Shadow id={id} y={91} rx={28} />
    {[0, 1, 2, 3].map((k) => {
      const t = cyc(f, 60, k * 15), x = 24 + k * 9 + 3 * Math.sin(t * 7 + k), y = 54 - 40 * t;
      return <g key={k}><circle cx={x} cy={y} r={2.2 * (1 - t) + 0.5} fill="#ffb347" opacity={Math.sin(Math.PI * t) * 0.9} filter={`url(#${id}g)`} /><circle cx={x} cy={y} r={0.9 * (1 - t) + 0.3} fill="#fff3c4" opacity={Math.sin(Math.PI * t)} /></g>;
    })}
    <g transform={`rotate(${shiver} 62 30)`}>
      <path d="M64 23C66 15 72 11 79 10.5" fill="none" stroke="#4d6b1e" strokeWidth="4" strokeLinecap="round" />
      <path d={CHILI} fill={`url(#${id}r)`} />
      <path d={CHILI} fill={`url(#${id}h)`} />
      <path d="M55 40c2 6-1 14-7 20M40 64c-4 4-9 7-14 9" fill="none" stroke="#5c0b05" strokeOpacity=".35" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M61 32C67 32 71 38 69 46" fill="none" stroke="#fff" strokeOpacity=".85" strokeWidth="3.6" strokeLinecap="round" filter={`url(#${id}b)`} />
      <path d="M45 57C41 64 35 70 28 74" fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="2.4" strokeLinecap="round" filter={`url(#${id}b)`} />
      <Glint id={id} body={CHILI} f={f} />
      <path d="M51 31C54 22 64 19 71 24.5C67 28.5 60 31 51 31z" fill={`url(#${id}k)`} />
      <path d="M56 28c3-3 7-4 11-3" fill="none" stroke="#fff" strokeOpacity=".4" strokeWidth="1.1" strokeLinecap="round" />
    </g>
  </>;
}

const GUR_TOP = "M18 50a32 13 0 1 0 64 0a32 13 0 1 0-64 0z";
const GUR = "M18 50v12a32 13 0 0 0 64 0V50a32 13 0 0 0-64 0z";
const SPECKS = [[30, 48, 1.1], [38, 54, 1], [47, 46, 1.2], [55, 53, 0.9], [63, 47, 1.1], [70, 52, 1], [42, 41, 0.8], [58, 40, 0.9], [33, 55, 0.8], [66, 56, 0.9]];
const CRYSTALS = [[36, 45, 3.4, 0], [60, 43, 2.8, 0.33], [52, 54, 2.4, 0.66]];
function Gur({ f, id }: Art) {
  // Taste moment: sugar crystals catch the light in turn, and a crumb tumbles off the edge (72–108).
  const t = cl((f - 72) / 36);
  return <>
    <defs>
      <radialGradient id={`${id}t`} cx=".4" cy=".3" r=".8"><stop offset="0" stopColor="#fbd79a" /><stop offset=".5" stopColor="#e2a35a" /><stop offset="1" stopColor="#b9732f" /></radialGradient>
      <linearGradient id={`${id}e`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#8a4b17" /><stop offset=".35" stopColor="#c98236" /><stop offset=".6" stopColor="#a9662a" /><stop offset="1" stopColor="#6e3a12" /></linearGradient>
    </defs>
    <Shadow id={id} y={82} rx={30} />
    <path d={GUR} fill={`url(#${id}e)`} />
    <path d="M26 66c0-4 1-8 2-11M40 72c0-4 0-8 1-12M60 72c0-4 0-8-1-12M74 66c0-4-1-8-2-11" fill="none" stroke="#4a2209" strokeOpacity=".3" strokeWidth="1.2" strokeLinecap="round" />
    <path d={GUR_TOP} fill={`url(#${id}t)`} />
    <ellipse cx="50" cy="50" rx="20" ry="7.6" fill="none" stroke="#a3611f" strokeOpacity=".45" strokeWidth="1.4" />
    <ellipse cx="50" cy="50.6" rx="20" ry="7.6" fill="none" stroke="#fff" strokeOpacity=".3" strokeWidth="1" />
    <g fill="#fff6e0" opacity=".7">{SPECKS.map(([x, y, r]) => <circle key={`${x}-${y}`} cx={x} cy={y} r={r} />)}</g>
    <path d="M22 47a32 13 0 0 1 50-7" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="1.8" strokeLinecap="round" filter={`url(#${id}g)`} />
    <ellipse cx="40" cy="45" rx="12" ry="3.4" fill="#fff" opacity=".35" filter={`url(#${id}b)`} />
    <Glint id={id} body={GUR} f={f} />
    {CRYSTALS.map(([x, y, r, ph]) => <path key={ph} transform={`translate(${x} ${y}) scale(${Math.max(0, W(f, LOOP, ph)) ** 3})`} d={`M0-${r}Q0 0 ${r} 0Q0 0 0 ${r}Q0 0-${r} 0Q0 0 0-${r}z`} fill="#fff" />)}
    {t > 0 && t < 1 && <g transform={`translate(${80 + 6 * t} ${58 + 30 * t * t}) rotate(${260 * t})`} opacity={1 - t * t}><path d="M-2.6-2 2.4-2.6 2.8 2-2 2.6z" fill="#b8702c" /></g>}
  </>;
}

/** The clay plate (মাটির সরা) every taste rests on. */
function Plate({ id }: { id: string }) {
  return <>
    <defs>
      <radialGradient id={`${id}p`} cx=".45" cy=".3" r=".8"><stop offset="0" stopColor="#d98552" /><stop offset=".6" stopColor="#b85a2b" /><stop offset="1" stopColor="#7d3514" /></radialGradient>
      <radialGradient id={`${id}q`} cx=".5" cy=".35" r=".7"><stop offset="0" stopColor="#9c4520" /><stop offset="1" stopColor="#c06a3a" /></radialGradient>
    </defs>
    <ellipse cx="50" cy="88" rx="40" ry="7" fill="#3f1a0b" opacity=".25" filter={`url(#${id}s)`} />
    <path d="M10 76a40 11 0 0 0 80 0l-4 6a36 9 0 0 1-72 0z" fill="#8a3c17" />
    <ellipse cx="50" cy="76" rx="40" ry="11" fill={`url(#${id}p)`} />
    <ellipse cx="50" cy="76" rx="31" ry="7.5" fill={`url(#${id}q)`} />
    <path d="M14 73a40 11 0 0 1 50-7.6" fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="1.4" strokeLinecap="round" />
  </>;
}

const OBJECTS = { sour: Mango, chili: Chili, sweet: Gur };
export function TasteArt({ icon, frame = REST_FRAME }: { icon: TasteIcon; frame?: number }) {
  // SVG ids are document-global, so each badge namespaces its gradients, filters and clips.
  const id = `tb${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const Taste = OBJECTS[icon];
  return <svg viewBox="0 0 100 100" width="100%" height="100%" overflow="visible" aria-hidden="true">
    <defs><Kit id={id} /></defs>
    <Plate id={id} />
    <g transform="translate(50 77) scale(.86) translate(-50 -86)"><Taste f={frame} id={id} /></g>
  </svg>;
}
