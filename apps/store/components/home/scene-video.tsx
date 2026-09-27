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

  useEffect(() => {
    if (src || !moving || !near) return;
    const { connection } = navigator as Navigator & { connection?: { saveData?: boolean } };
    if (connection?.saveData) return;
    setSrc(heroVideoFile(video, window.matchMedia('(min-width: 1024px)').matches));
  }, [src, moving, near, video]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !src) return;
    if (active && moving) {
      el.play().catch(() => {
        // Autoplay refused: the photograph underneath stays.
      });
    } else {
      el.pause();
    }
  }, [active, moving, src]);

  return (
    <video
      ref={ref}
      src={src ?? undefined}
      muted
      loop
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
