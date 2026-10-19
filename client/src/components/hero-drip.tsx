import React, { useEffect, useRef, useState } from "react";
import { prefersStillArt } from "../lib/alpha-video";

// Approved 2026-10-18 ("Cinemagraph" in docs/design/2026-10-18-hero-motion): the hero photo's ঝোলা গুড় drip
// and a glint across the jars, a seamless 4s HyperFrames loop. It is a transparent overlay that lines up
// pixel for pixel with hero-jaggery-still-life.webp, so the photo stays the page's first image and the
// overlay only adds motion on top. Rename the file when the render changes, so no cache serves the old loop.
export const HERO_DRIP_VIDEO = "/home/hero-jaggery-drip-1.webm";

export function HeroDrip() {
  const [enabled, setEnabled] = useState(false);
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (prefersStillArt()) return;
    // Start after the page has loaded, so the loop never competes with the hero photo's first paint.
    if (document.readyState === "complete") {
      setEnabled(true);
      return;
    }
    const start = () => setEnabled(true);
    window.addEventListener("load", start, { once: true });
    return () => window.removeEventListener("load", start);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!enabled || !video) return;
    video.muted = true;
    // Loop only while the hero is on screen. If autoplay is refused, the photo alone is the hero.
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) video.play()?.catch(() => setEnabled(false));
      else video.pause();
    });
    observer.observe(video);
    return () => observer.disconnect();
  }, [enabled]);

  if (!enabled) return null;
  return (
    <video
      ref={videoRef}
      src={HERO_DRIP_VIDEO}
      muted
      loop
      playsInline
      preload="auto"
      disablePictureInPicture
      aria-hidden="true"
      data-playing={playing || undefined}
      onPlaying={() => setPlaying(true)}
      onError={() => setEnabled(false)}
    />
  );
}
