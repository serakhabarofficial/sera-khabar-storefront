import { useEffect, useRef } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { TasteArt, type Pose, type TasteIcon } from "./taste-icons";

// One 3s loop per taste: টক puckers and shakes, ঝাল sways under rising heat, মিষ্টি twists its
// wrapper while sparkles twinkle. Every pose is a pure function of the frame, so the loop is seamless.
const LOOP = { size: 192, fps: 30, duration: 90 };
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const out = Easing.bezier(0.23, 1, 0.32, 1);
const wave = (f: number, period: number, phase = 0) => Math.sin(2 * Math.PI * (f / period + phase));

function usePose(icon: TasteIcon): Pose {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (icon === "sour") {
    const squeeze = Math.min(spring({ frame: f - 8, fps, config: { damping: 9, stiffness: 220 } }), interpolate(f, [56, 70], [1, 0], { ...clamp, easing: out }));
    return { squeeze, sway: Math.max(0, squeeze) * Math.sin(f * 1.5) * 4, waves: [], sparkles: [] };
  }
  if (icon === "chili") return { squeeze: 0, sway: wave(f, 90) * 5, waves: [0, 1, 2].map((k) => ((f + k * 15) % 45) / 45), sparkles: [] };
  return { squeeze: wave(f, 45), sway: wave(f, 90) * 8, waves: [], sparkles: [0, 1, 2].map((k) => Math.max(0, wave(f, 90, k / 3))) };
}

function TasteLoop({ icon, ink }: { icon: TasteIcon; ink: string }) {
  return <AbsoluteFill><TasteArt icon={icon} ink={ink} pose={usePose(icon)} /></AbsoluteFill>;
}

export default function TasteIconPlayer({ icon, ink, playing, offset }: { icon: TasteIcon; ink: string; playing: boolean; offset: number }) {
  const ref = useRef<PlayerRef>(null);
  useEffect(() => {
    if (playing) ref.current?.play();
    else ref.current?.pause();
  }, [playing]);
  return <Player ref={ref} component={TasteLoop} inputProps={{ icon, ink }} durationInFrames={LOOP.duration} fps={LOOP.fps} compositionWidth={LOOP.size} compositionHeight={LOOP.size} initialFrame={offset} style={{ width: "100%", height: "100%" }} loop controls={false} clickToPlay={false} doubleClickToFullscreen={false} spaceKeyToPlayOrPause={false} numberOfSharedAudioTags={0} initiallyMuted acknowledgeRemotionLicense />;
}
