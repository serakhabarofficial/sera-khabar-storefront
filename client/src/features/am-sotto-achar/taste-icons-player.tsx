import { useEffect, useRef } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { LOOP, TasteArt, type TasteIcon } from "./taste-icons";

// One calm 4s loop per taste: a glint sweeps across each object, then its taste moment plays
// (the mango cheek drips juice, the chilli shivers under rising sparks, the gur's crystals twinkle
// and a crumb falls). Every pose is a pure function of the frame, so the loop is seamless.
const SIZE = 216, FPS = 30;

function TasteLoop({ icon }: { icon: TasteIcon }) {
  return <AbsoluteFill><TasteArt icon={icon} frame={useCurrentFrame()} /></AbsoluteFill>;
}

export default function TasteIconPlayer({ icon, playing, offset }: { icon: TasteIcon; playing: boolean; offset: number }) {
  const ref = useRef<PlayerRef>(null);
  useEffect(() => {
    if (playing) ref.current?.play();
    else ref.current?.pause();
  }, [playing]);
  return <Player ref={ref} component={TasteLoop} inputProps={{ icon }} durationInFrames={LOOP} fps={FPS} compositionWidth={SIZE} compositionHeight={SIZE} initialFrame={offset} style={{ width: "100%", height: "100%" }} loop controls={false} clickToPlay={false} doubleClickToFullscreen={false} spaceKeyToPlayOrPause={false} numberOfSharedAudioTags={0} initiallyMuted acknowledgeRemotionLicense />;
}
