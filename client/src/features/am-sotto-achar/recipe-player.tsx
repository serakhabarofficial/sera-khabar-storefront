import { useEffect, useRef, type CSSProperties } from "react";
import { Player, type PlayerRef, type CallbackListener } from "@remotion/player";
import { AbsoluteFill, Easing, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { AMSOTTO_BOWL_IMAGE } from "./content";

// Approved prototype composition, unchanged geometry/timing. Only the pulse tail repeats.
const RECIPE = { width: 1080, height: 1150, fps: 30, duration: 256, settle: 176 };
const PULSE = 40;
const C = { tam: "#3f1a0b", sub: "#7a5541", chili: "#c7361c" };
const FONT = '"Noto Serif Bengali", serif', SCRIPT = '"Galada", cursive';
const out = Easing.bezier(0.23, 1, 0.32, 1);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const PHOTO = { x: 80, y: 20, size: 920 };
const at = (x: number, y: number): [number, number] => [PHOTO.x + x / 1000 * PHOTO.size, PHOTO.y + y / 1000 * PHOTO.size];
type Spot = { name: string; note: string; dot: [number, number]; card: [number, number]; side: "left" | "right"; at: number };
const SPOTS: Spot[] = [
  { name: "আমসত্ত্ব", note: "রাজশাহীর বাগানের", dot: at(705, 450), card: [808, 24], side: "right", at: 20 },
  { name: "গোটা মশলা", note: "হাতে বাছা", dot: at(330, 480), card: [20, 820], side: "left", at: 46 },
  { name: "মরিচ ও গুড়", note: "ঠিক যতটুকু", dot: at(300, 330), card: [20, 24], side: "left", at: 72 },
  { name: "সরিষার তেল", note: "ঘানি ভাঙা", dot: at(520, 690), card: [808, 820], side: "right", at: 98 },
];
const NONE_AT = 130, NONE = ["প্রিজারভেটিভ", "কৃত্রিম রং", "কেমিক্যাল"];

function Hotspot({ spot, f }: { spot: Spot; f: number }) {
  const { fps } = useVideoConfig();
  const pop = spring({ frame: f - spot.at, fps, config: { damping: 12, stiffness: 260 } });
  if (f < spot.at) return null;
  const [x, y] = spot.dot;
  const ax = spot.side === "left" ? spot.card[0] + 252 : spot.card[0], ay = spot.card[1] + 63;
  const draw = interpolate(f, [spot.at + 6, spot.at + 18], [0, 1], { ...clamp, easing: out });
  const lx = x + (ax - x) * draw, ly = y + (ay - y) * draw;
  return <g>
    <line x1={x} y1={y} x2={lx} y2={ly} stroke="rgba(63,26,11,.35)" strokeWidth={7} strokeLinecap="round" />
    <line x1={x} y1={y} x2={lx} y2={ly} stroke="#fff" strokeWidth={3.5} strokeLinecap="round" />
    {[0, PULSE / 2].map((offset) => { const local = f - spot.at - 8 - offset; if (local < 0) return null; const p = (local % PULSE) / PULSE; return <circle key={offset} cx={x} cy={y} r={14 + 34 * p} fill="none" stroke="#fff" strokeWidth={3} opacity={0.8 * (1 - p)} />; })}
    <circle cx={x} cy={y} r={17 * pop} fill="#fff" stroke={C.chili} strokeWidth={6} /><circle cx={x} cy={y} r={5 * pop} fill={C.chili} />
  </g>;
}
function Card({ spot, f }: { spot: Spot; f: number }) {
  const p = interpolate(f, [spot.at + 12, spot.at + 26], [0, 1], { ...clamp, easing: out });
  const style: CSSProperties = { position: "absolute", left: spot.card[0], top: spot.card[1], width: 252, height: 126, boxSizing: "border-box", padding: "14px 22px", borderRadius: 24, background: "rgba(255,250,241,.5)", backdropFilter: "blur(18px) saturate(1.6)", WebkitBackdropFilter: "blur(18px) saturate(1.6)", boxShadow: "inset 0 0 0 2px rgba(255,255,255,.6), 0 0 0 2px rgba(63,26,11,.06), 0 18px 34px -18px rgba(63,26,11,.45)", textAlign: spot.side === "left" ? "left" : "right", opacity: p, transform: `translateX(${(spot.side === "left" ? 20 : -20) * (1 - p)}px) scale(${0.96 + 0.04 * p})`, transformOrigin: spot.side === "left" ? "right center" : "left center", whiteSpace: "nowrap" };
  return <div style={style}><div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 42, lineHeight: 1.3, color: C.tam }}>{spot.name}</div><div style={{ fontFamily: SCRIPT, fontSize: 30, lineHeight: 1.35, color: C.chili }}>{spot.note}</div></div>;
}
function NoneChip({ text, i, f }: { text: string; i: number; f: number }) {
  const start = NONE_AT + 4 + i * 8;
  const p = interpolate(f, [start, start + 12], [0, 1], { ...clamp, easing: out });
  const strike = interpolate(f, [start + 10, start + 20], [0, 1], { ...clamp, easing: out });
  return <div style={{ position: "absolute", left: 210 + i * 330, top: 1086, transform: `translate(-50%,-50%) translateY(${16 * (1 - p)}px)`, opacity: p, padding: "8px 30px 12px", borderRadius: 999, background: "#fff", boxShadow: "0 0 0 2px rgba(63,26,11,.12), 0 12px 22px -14px rgba(63,26,11,.45)", fontFamily: FONT, fontWeight: 700, fontSize: 38, lineHeight: 1.4, color: strike > 0.5 ? C.sub : C.tam, whiteSpace: "nowrap" }}>{text}<span style={{ position: "absolute", left: 18, right: 18, top: "52%", height: 5, borderRadius: 5, background: C.chili, transform: `rotate(-3deg) scaleX(${strike})`, transformOrigin: "left center" }} /></div>;
}
function Recipe() {
  const f = useCurrentFrame();
  const enter = interpolate(f, [0, 18], [0, 1], { ...clamp, easing: out });
  const zoom = interpolate(f, [0, RECIPE.settle], [0.95, 1], { ...clamp, easing: out });
  const oilAt = SPOTS[3].at;
  const sweep = interpolate(f, [oilAt + 2, oilAt + 32], [100, 0], { ...clamp, easing: Easing.inOut(Easing.quad) });
  const none = interpolate(f, [NONE_AT, NONE_AT + 12], [0, 1], { ...clamp, easing: out });
  return <AbsoluteFill style={{ overflow: "hidden" }}>
    <div style={{ position: "absolute", left: PHOTO.x, top: PHOTO.y, width: PHOTO.size, height: PHOTO.size, opacity: enter, transform: `scale(${zoom})` }}>
      <Img src={AMSOTTO_BOWL_IMAGE} alt="" style={{ width: "100%", height: "100%", display: "block" }} />
      {f > oilAt && f < oilAt + 34 && <div style={{ position: "absolute", inset: 0, WebkitMaskImage: `url(${AMSOTTO_BOWL_IMAGE})`, maskImage: `url(${AMSOTTO_BOWL_IMAGE})`, WebkitMaskSize: "100% 100%", maskSize: "100% 100%", background: "linear-gradient(110deg, transparent 40%, rgba(255,240,200,.9) 50%, transparent 60%)", backgroundSize: "260% 100%", backgroundPosition: `${sweep}% 0`, mixBlendMode: "soft-light" }} />}
    </div>
    <svg viewBox={`0 0 ${RECIPE.width} ${RECIPE.height}`} width={RECIPE.width} height={RECIPE.height} style={{ position: "absolute", inset: 0, overflow: "visible" }}>{SPOTS.map((s) => <Hotspot key={s.name} spot={s} f={f} />)}</svg>
    {SPOTS.map((s) => <Card key={s.name} spot={s} f={f} />)}
    <div style={{ position: "absolute", left: 0, right: 0, top: 984, textAlign: "center", fontFamily: SCRIPT, fontSize: 40, color: C.chili, opacity: none, transform: `translateY(${12 * (1 - none)}px)` }}>যা একদম নেই</div>
    {NONE.map((t, i) => <NoneChip key={t} text={t} i={i} f={f} />)}
  </AbsoluteFill>;
}

export default function RecipePlayer({ playing, startAtEnd }: { playing: boolean; startAtEnd: boolean }) {
  const ref = useRef<PlayerRef>(null);
  const last = useRef(0);
  useEffect(() => {
    const player = ref.current!;
    if (startAtEnd) { player.seekTo(RECIPE.duration - 1); return; }
    const frame: CallbackListener<"frameupdate"> = ({ detail }) => {
      const f = detail.frame;
      if (f >= RECIPE.duration - 2 || (f < last.current && last.current > RECIPE.settle)) {
        player.seekTo(RECIPE.settle);
        last.current = RECIPE.settle;
        return;
      }
      last.current = f;
    };
    player.addEventListener("frameupdate", frame);
    return () => player.removeEventListener("frameupdate", frame);
  }, [startAtEnd]);
  useEffect(() => {
    if (playing && !startAtEnd) ref.current?.play();
    else ref.current?.pause();
  }, [playing, startAtEnd]);
  return <Player ref={ref} component={Recipe} durationInFrames={RECIPE.duration} fps={RECIPE.fps} compositionWidth={RECIPE.width} compositionHeight={RECIPE.height} style={{ width: "100%", aspectRatio: `${RECIPE.width}/${RECIPE.height}` }} loop controls={false} clickToPlay={false} doubleClickToFullscreen={false} spaceKeyToPlayOrPause={false} numberOfSharedAudioTags={0} initiallyMuted acknowledgeRemotionLicense />;
}
