'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';

import { heroVideoFile } from '@/lib/catalog/hero-scenes';
import { useSlideMotion } from '@/components/home/hero-carousel';

// A scene's loop plays over its photograph while its slide shows. The file is
// fetched only once the slide is showing or next, and only where motion is
// welcome: reduced motion, Save-Data and the pause button keep the photograph
// and download nothing. The loop fades in once it actually plays, so a slow
// network or a refused autoplay (iOS Low Power Mode) leaves the photograph
// rather than a blank frame; once shown, it stays, paused, between turns.
// A slide that turns away keeps its loop running through the crossfade, so
// nothing freezes mid-sway while it fades out. Each time the slide comes round,
// its loop starts again on its first frame, the photograph. A loop plays once,
// forward and back, for longer than a showing; a slide that a pointer or focus
// holds longer comes to rest on the photograph. The file never wraps: in a still
// scene its fresh keyframe would tick.

// The carousel's crossfade (its slides' duration-700).
const CROSSFADE_MS = 700;

export function SceneVideo({
  video,
  className,
  style,
}: {
  video: string;
  /** The photograph's own fit, position and drift, so the two stay registered. */
  className: string;
  style?: CSSProperties;
}) {
  const { active, near, moving } = useSlideMotion();
  const ref = useRef<HTMLVideoElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [shown, setShown] = useState(false);
  const wasActive = useRef(active);

  useEffect(() => {
    if (src || !moving || !near) return;
    const { connection } = navigator as Navigator & { connection?: { saveData?: boolean } };
    if (connection?.saveData) return;
    setSrc(heroVideoFile(video, window.matchMedia('(min-width: 1024px)').matches));
  }, [src, moving, near, video]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !src) return;
    const arrived = active && !wasActive.current;
    wasActive.current = active;
    if (active && moving) {
      if (arrived && el.paused) {
        // Round again from the photograph; back within the crossfade, it runs on.
        el.currentTime = 0;
      } else if (el.ended) {
        // Held past its loop, it rests on the photograph: play() would wrap it.
        return;
      }
      el.play().catch(() => {
        // Autoplay refused: the photograph underneath stays.
      });
      return;
    }
    if (!moving) {
      el.pause();
      return;
    }
    const fadedOut = window.setTimeout(() => el.pause(), CROSSFADE_MS);
    return () => window.clearTimeout(fadedOut);
  }, [active, moving, src]);

  return (
    <video
      ref={ref}
      src={src ?? undefined}
      muted
      playsInline
      preload="auto"
      aria-hidden
      data-shown={shown}
      onPlaying={() => setShown(true)}
      className={`absolute inset-0 size-full opacity-0 transition-opacity duration-700 data-[shown=true]:opacity-100 ${className}`}
      style={style}
    />
  );
}
