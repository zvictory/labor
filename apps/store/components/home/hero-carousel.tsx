'use client';

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

// The home hero's slides crossfade on a timer, and the timer is the progress
// bar: the active segment's CSS animation runs for one slide's length and, when
// it ends, the next slide comes up. Pausing the bar pauses the carousel — while
// a mouse rests on the hero, while keyboard focus is inside it, while the tab
// is hidden, and after the pause button. Reduced motion: no autoplay; the
// segments still switch slides. The slides are server-rendered; this component
// only decides which one shows, and tells each slide whether its scene loop
// may load and play (useSlideMotion).

export type HeroCarouselLabels = {
  carousel: string;
  /** One per slide, e.g. "1 из 3: Ombre Nomade". */
  slides: string[];
  pause: string;
  play: string;
};

/** What a slide's own motion, its scene loop, may do right now. */
export type SlideMotion = {
  /** The slide is the one showing. */
  active: boolean;
  /** The slide is showing or next, so its media may load. */
  near: boolean;
  /**
   * Motion is welcome: not under reduced motion, in a hidden tab or after the
   * pause button — a loop runs for longer than five seconds, so the button
   * stops it too. A resting mouse holds the slide, not the loop.
   */
  moving: boolean;
};

const SlideMotionContext = createContext<SlideMotion>({
  active: false,
  near: false,
  moving: false,
});

export const useSlideMotion = (): SlideMotion => useContext(SlideMotionContext);

// A swipe must travel this far, and mostly sideways, before it turns a slide.
const SWIPE_PX = 48;

export function HeroCarousel({
  slides,
  labels,
}: {
  slides: ReactNode[];
  labels: HeroCarouselLabels;
}) {
  const count = slides.length;
  const [active, setActive] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [reduced, setReduced] = useState(false);
  // Slides stay out of the layout until the carousel nears them: the one
  // showing and the one after it. A lazy image in a stacked, transparent slide
  // still counts as on screen, so without this every photograph would load
  // with the first and slow it down on a phone. The next slide opens a full
  // turn early, so its photograph is in by the crossfade.
  const [near, setNear] = useState<ReadonlySet<number>>(() => new Set([0, 1]));
  const swipeFrom = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncMotion = () => setReduced(motion.matches);
    const syncHidden = () => setHidden(document.hidden);
    syncMotion();
    syncHidden();
    setMounted(true);
    motion.addEventListener('change', syncMotion);
    document.addEventListener('visibilitychange', syncHidden);
    return () => {
      motion.removeEventListener('change', syncMotion);
      document.removeEventListener('visibilitychange', syncHidden);
    };
  }, []);

  // Until hydration the bar holds at zero: an animation that ended before
  // React listened for it would never turn the slide.
  const playing = mounted && count > 1 && !paused && !hovered && !focused && !hidden && !reduced;
  const moving = mounted && !paused && !hidden && !reduced;
  const go = (index: number) => {
    const next = (index + count) % count;
    setActive(next);
    setNear((was) => new Set([...was, next, (next + 1) % count]));
  };

  return (
    <section
      aria-roledescription="carousel"
      aria-label={labels.carousel}
      className="border-border relative border-b"
      onPointerEnter={(e) => e.pointerType === 'mouse' && setHovered(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setHovered(false)}
      onFocus={(e) => e.target.matches(':focus-visible') && setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
      }}
    >
      <div
        aria-live={playing ? 'off' : 'polite'}
        className="grid touch-pan-y"
        onPointerDown={(e) => {
          if (e.pointerType !== 'mouse') swipeFrom.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={(e) => {
          const from = swipeFrom.current;
          swipeFrom.current = null;
          if (!from || count < 2) return;
          const dx = e.clientX - from.x;
          if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > 1.5 * Math.abs(e.clientY - from.y)) {
            go(active + (dx < 0 ? 1 : -1));
          }
        }}
        onPointerCancel={() => {
          swipeFrom.current = null;
        }}
      >
        {/* Each slide carries its own paper: the active one's z-index makes it a
            stacking context, and a bottle photo's multiply blend needs a colour
            inside it to turn its white into paper. */}
        {slides.map((slide, i) => (
          <div
            key={i}
            role="group"
            aria-roledescription="slide"
            aria-label={labels.slides[i]}
            data-active={i === active}
            inert={i !== active}
            hidden={!near.has(i)}
            className="group/slide bg-background relative overflow-hidden opacity-0 transition-opacity duration-700 ease-out [grid-area:1/1] data-[active=true]:z-[1] data-[active=true]:opacity-100"
          >
            <SlideMotionContext value={{ active: i === active, near: near.has(i), moving }}>
              {slide}
            </SlideMotionContext>
          </div>
        ))}
      </div>

      {/* Phones: a row of bars under the slides, clear of every bottle; the
          numbers wait for desktop, where seven of them fit. Desktop: a label
          plate under the text, on the paper side: a wide screen enlarges the
          scene until a bottle's base reaches the lower right. */}
      {count > 1 && (
        <div className="lg:pointer-events-none lg:absolute lg:inset-x-0 lg:bottom-8 lg:z-[2]">
          <div className="container flex pb-2 lg:pb-0">
            <div className="lg:border-hairline lg:bg-background/85 flex w-full items-center lg:pointer-events-auto lg:w-auto lg:border lg:backdrop-blur-sm">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => go(i)}
                  aria-label={labels.slides[i]}
                  aria-current={i === active ? 'true' : undefined}
                  className="flex h-11 flex-1 items-center gap-2 pr-3 lg:flex-none lg:px-2"
                >
                  <span
                    className={`text-micro hidden font-mono tabular-nums lg:inline ${i === active ? 'text-foreground' : 'text-muted-foreground'}`}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="bg-hairline relative block h-px flex-1 overflow-hidden lg:w-6 lg:flex-none">
                    {i === active && !reduced ? (
                      <span
                        key={`run-${active}`}
                        onAnimationEnd={() => go(active + 1)}
                        style={{ animationPlayState: playing ? 'running' : 'paused' }}
                        className="bg-foreground absolute inset-0 origin-left scale-x-0 animate-[hero-progress_7s_linear_forwards]"
                      />
                    ) : (
                      <span
                        className={`bg-foreground absolute inset-0 origin-left ${i <= active ? 'scale-x-100' : 'scale-x-0'}`}
                      />
                    )}
                  </span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPaused((was) => !was)}
                aria-label={paused ? labels.play : labels.pause}
                className="lg:border-hairline flex h-11 w-11 items-center justify-center lg:border-l"
              >
                <svg viewBox="0 0 10 10" className="h-2.5 w-2.5 fill-current" aria-hidden>
                  {paused ? <path d="M2 1l7 4-7 4z" /> : <path d="M2 1h2v8H2zM6 1h2v8H6z" />}
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
