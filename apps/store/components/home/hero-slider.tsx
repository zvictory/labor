'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, ArrowRight } from 'lucide-react';

// Client hero slideshow. Prop-driven (slides come from the RSC page) — the only
// client island on the homepage above the fold. Ported from
// apps/web/src/components/home/hero-slider.tsx.

interface Slide {
  image: string;
  tagline: string;
  headline: string;
  sub: string;
  cta: string;
  href: string;
}

interface HeroSliderProps {
  slides: Slide[];
}

export function HeroSlider({ slides }: HeroSliderProps) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const prevSlide = () => {
    setCurrent((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const nextSlide = () => {
    setCurrent((prev) => (prev + 1) % slides.length);
  };

  return (
    <div className="relative w-full overflow-hidden border-b border-border bg-bone dark:bg-ink">
      <div className="relative h-[80vh] min-h-[550px] w-full md:h-[88vh]">
        {slides.map((slide, idx) => (
          <div
            key={idx}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              idx === current ? 'z-10 opacity-100' : 'pointer-events-none z-0 opacity-0'
            }`}
          >
            <div className="group absolute inset-0 overflow-hidden">
              <div className="absolute inset-0 z-10 bg-ink/10 mix-blend-multiply dark:bg-ink/20" />
              <Image
                src={slide.image}
                alt={slide.headline}
                fill
                priority={idx === 0}
                className="object-cover transition-transform duration-[8000ms] ease-out group-hover:scale-105"
                sizes="100vw"
              />
            </div>

            <div className="absolute bottom-24 left-6 right-6 z-20 max-w-sm space-y-4 border border-border/80 bg-bone/50 p-8 shadow-2xl backdrop-blur-md transition-all duration-300 dark:bg-ink/50 md:bottom-28 md:left-16 md:max-w-lg md:space-y-6 md:p-12 lg:left-24">
              <span className="block text-[10px] font-bold uppercase tracking-[0.4em] text-brass md:text-xs">
                {slide.tagline}
              </span>
              <h1 className="font-display text-4xl leading-[1.1] text-ink dark:text-bone md:text-5xl lg:text-6xl">
                {slide.headline}
              </h1>
              <p className="max-w-md font-sans text-xs leading-relaxed text-ink-muted dark:text-stone-400 md:text-sm">
                {slide.sub}
              </p>
              <div className="pt-2">
                <Link
                  href={slide.href}
                  className="inline-flex h-11 items-center bg-ink px-6 text-[10px] font-semibold uppercase tracking-widest text-bone transition-all duration-300 hover:translate-x-1 hover:bg-brass dark:bg-bone dark:text-ink dark:hover:bg-brass md:px-8 md:text-xs"
                >
                  {slide.cta}
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="absolute bottom-8 right-6 z-30 flex items-center gap-3 md:right-16 lg:right-24">
        <button
          onClick={prevSlide}
          className="flex h-10 w-10 items-center justify-center border border-border bg-bone/90 text-ink backdrop-blur-sm transition-all hover:bg-brass hover:text-white dark:bg-stone-900/90 dark:text-bone dark:hover:bg-brass"
          aria-label="Previous slide"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <button
          onClick={nextSlide}
          className="flex h-10 w-10 items-center justify-center border border-border bg-bone/90 text-ink backdrop-blur-sm transition-all hover:bg-brass hover:text-white dark:bg-stone-900/90 dark:text-bone dark:hover:bg-brass"
          aria-label="Next slide"
        >
          <ArrowRight className="h-4 w-4" />
        </button>

        <div className="ml-4 flex gap-2">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrent(idx)}
              className={`h-1.5 transition-all duration-300 ${
                idx === current ? 'w-8 bg-brass' : 'w-2 bg-border hover:bg-ink-muted'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
