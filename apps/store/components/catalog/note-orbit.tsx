'use client';

// The orbit is decorative (aria-hidden; the card's text already names the product).
// The frames are square because nothing in this system is rounded.
// Geometry comes from the approved Ombre Nomade prototype.

import Image from 'next/image';
import { useEffect, useRef, useState, type CSSProperties } from 'react';

import { ORBITS, orbitSlot } from '@/lib/catalog/orbit';
import type { OrbitNoteDTO } from '@/lib/catalog/types';

type Vars = CSSProperties & Record<`--${string}`, string>;

const BADGE_REST = 'left-1/2 top-1/2 scale-[.2] opacity-0';
const BADGE_LIVE = [
  BADGE_REST,
  'transition-[left,top,scale,opacity] duration-[320ms] ease-[cubic-bezier(.4,0,1,1)] delay-(--out)',
  'group-hover:left-(--x) group-hover:top-(--y) group-hover:scale-100 group-hover:opacity-100',
  'group-hover:duration-[600ms] group-hover:ease-[cubic-bezier(.34,1.56,.64,1)] group-hover:delay-(--in)',
  'group-focus-within:left-(--x) group-focus-within:top-(--y) group-focus-within:scale-100 group-focus-within:opacity-100',
  'group-focus-within:duration-[600ms] group-focus-within:ease-[cubic-bezier(.34,1.56,.64,1)] group-focus-within:delay-(--in)',
  'motion-reduce:left-(--x) motion-reduce:top-(--y) motion-reduce:scale-100 motion-reduce:transition-opacity',
].join(' ');

const LINE_REST = 'opacity-0';
const LINE_LIVE = [
  'opacity-0 [stroke-dashoffset:1] transition-[stroke-dashoffset,opacity] duration-[350ms] ease-[cubic-bezier(.22,1,.36,1)]',
  'group-hover:opacity-60 group-hover:[stroke-dashoffset:0] group-hover:duration-[1100ms] group-hover:delay-(--d)',
  'group-focus-within:opacity-60 group-focus-within:[stroke-dashoffset:0] group-focus-within:duration-[1100ms] group-focus-within:delay-(--d)',
  'motion-reduce:[stroke-dashoffset:0]',
].join(' ');

export function NoteOrbit({ notes }: { notes: OrbitNoteDTO[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [armed, setArmed] = useState(false);
  const [live, setLive] = useState(false);

  // Nothing mounts until the card is first pointed at or focused: a catalogue
  // page holds 24 cards, six illustrations each, and a phone never hovers.
  useEffect(() => {
    const card = ref.current?.closest<HTMLElement>('[data-orbit-card]');
    if (!card) return;
    const canHover = window.matchMedia('(hover: hover)').matches;
    const arm = () => setArmed(true);
    const onPointerEnter = (event: PointerEvent) => {
      if (canHover && event.pointerType !== 'touch') arm();
    };
    card.addEventListener('pointerenter', onPointerEnter);
    card.addEventListener('focusin', arm);
    return () => {
      card.removeEventListener('pointerenter', onPointerEnter);
      card.removeEventListener('focusin', arm);
    };
  }, []);

  // One frame at rest first, so the very first hover animates instead of popping in.
  useEffect(() => {
    if (!armed) return;
    const frame = requestAnimationFrame(() => setLive(true));
    return () => cancelAnimationFrame(frame);
  }, [armed]);

  return (
    <>
      {armed && (
        <svg
          aria-hidden="true"
          viewBox="0 0 300 400"
          preserveAspectRatio="none"
          className="text-gunmetal-light pointer-events-none absolute inset-0 z-0 size-full"
        >
          {ORBITS.map((orbit, i) => (
            <ellipse
              key={orbit.tilt}
              cx={150}
              cy={200}
              rx={orbit.rx * 300}
              ry={orbit.ry * 400}
              transform={`rotate(${orbit.tilt} 150 200)`}
              fill="none"
              stroke="currentColor"
              strokeWidth={1}
              pathLength={1}
              strokeDasharray="1 1"
              style={{ '--d': `${i * 100}ms` } as Vars}
              className={live ? LINE_LIVE : LINE_REST}
            />
          ))}
        </svg>
      )}
      <div
        ref={ref}
        aria-hidden="true"
        className="@container pointer-events-none absolute inset-0 z-[2]"
      >
        {armed &&
          notes.map((note, i) => {
            const { left, top } = orbitSlot(i);
            const vars: Vars = {
              '--x': `${left}%`,
              '--y': `${top}%`,
              '--in': `${i * 50}ms`,
              '--out': `${(notes.length - 1 - i) * 30}ms`,
              '--bob': `${3 + (i % 3) * 0.55}s`,
              '--bob-delay': `${i * 0.3}s`,
            };
            return (
              <div
                key={note.slug}
                style={vars}
                className={`absolute w-[24%] -translate-x-1/2 -translate-y-1/2 ${live ? BADGE_LIVE : BADGE_REST}`}
              >
                <div className="flex [animation:orbit-bob_var(--bob)_ease-in-out_var(--bob-delay)_infinite] flex-col items-center [animation-play-state:paused] group-focus-within:[animation-play-state:running] group-hover:[animation-play-state:running] motion-reduce:[animation:none]">
                  <span className="relative block aspect-square w-full">
                    <span className="border-hairline bg-background absolute inset-[17%] border" />
                    <Image
                      src={note.image}
                      alt=""
                      width={256}
                      height={256}
                      sizes="96px"
                      className="relative size-full object-contain"
                    />
                  </span>
                  <span className="text-foreground text-label -mt-1 font-mono whitespace-nowrap @max-[280px]:hidden">
                    {note.name}
                  </span>
                </div>
              </div>
            );
          })}
      </div>
    </>
  );
}
