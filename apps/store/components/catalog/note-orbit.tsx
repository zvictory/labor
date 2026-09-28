'use client';

// The orbit is decorative (aria-hidden; the card's text already names the product).
// It is the one place this system rounds, raises and gilds, on purpose: each note sits
// in a glass bead on gold rings, as in the approved Ombre Nomade prototype. Radius and
// shadow are arbitrary values because the config collapses `rounded-full` and `shadow-*`.
// Each ring is drawn in two halves, the far one behind the bottle and the near one over it.

import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';

import { ORBITS, ORBIT_SLOTS, orbitSlot } from '@/lib/catalog/orbit';
import type { OrbitNoteDTO } from '@/lib/catalog/types';

import { BEAD, GLINT } from './glass-bead';
import { NoteFace } from './note-face';

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
  'group-hover:opacity-90 group-hover:[stroke-dashoffset:0] group-hover:duration-[1100ms] group-hover:delay-(--d)',
  'group-focus-within:opacity-90 group-focus-within:[stroke-dashoffset:0] group-focus-within:duration-[1100ms] group-focus-within:delay-(--d)',
  'motion-reduce:[stroke-dashoffset:0]',
].join(' ');

// Both halves run from a ring's left end to its right: the far one over the top, the
// near one under the bottom (the arc's sweep flag).
const HALVES = [
  { half: 'far', sweep: 1, layer: 'z-0' },
  { half: 'near', sweep: 0, layer: 'z-[1]' },
] as const;

// Every badge sits near the card's edge, where a centred name wider than its bead
// is cut off ("Калабрийский бергамот"). So a name keeps at least its bead's width,
// which leaves a short one centred, and a long one grows toward the bottle.
const inward = (angle: number | undefined): string =>
  angle === undefined ? '' : Math.cos((angle * Math.PI) / 180) < 0 ? 'self-start' : 'self-end';

// Deep enough to hold a 1 px line on off-white, where pale gold all but vanishes.
const GOLD = [
  ['0', '#8a6526'],
  ['.3', '#c49a50'],
  ['.5', '#94712f'],
  ['.72', '#cfa85e'],
  ['1', '#8a6526'],
] as const;

export function NoteOrbit({ notes }: { notes: OrbitNoteDTO[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const gold = useId();
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
      {armed &&
        HALVES.map(({ half, sweep, layer }) => (
          <svg
            key={half}
            aria-hidden="true"
            viewBox="0 0 300 400"
            preserveAspectRatio="none"
            className={`pointer-events-none absolute inset-0 size-full dark:drop-shadow-[0_0_2px_rgb(212_175_105/.6)] ${layer}`}
          >
            <defs>
              <linearGradient
                id={`${gold}${half}`}
                gradientUnits="userSpaceOnUse"
                x1={0}
                y1={0}
                x2={300}
                y2={400}
              >
                {GOLD.map(([offset, color]) => (
                  <stop key={offset} offset={offset} stopColor={color} />
                ))}
              </linearGradient>
            </defs>
            {ORBITS.map((orbit, i) => {
              const rx = orbit.rx * 300;
              const ry = orbit.ry * 400;
              return (
                <path
                  key={orbit.tilt}
                  d={`M ${150 - rx} 200 A ${rx} ${ry} 0 0 ${sweep} ${150 + rx} 200`}
                  transform={`rotate(${orbit.tilt} 150 200)`}
                  fill="none"
                  stroke={`url(#${gold}${half})`}
                  strokeWidth={1.2}
                  pathLength={1}
                  strokeDasharray="1 1"
                  style={{ '--d': `${i * 100}ms` } as Vars}
                  className={live ? LINE_LIVE : LINE_REST}
                />
              );
            })}
          </svg>
        ))}
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
                    <span className={BEAD} />
                    <NoteFace picture={{ src: note.image, cutout: note.cutout }} sizes="96px" />
                    <span className={GLINT} />
                  </span>
                  <span
                    className={`text-foreground text-label -mt-0.5 min-w-full text-center whitespace-nowrap @max-[280px]:hidden ${inward(ORBIT_SLOTS[i])}`}
                  >
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
