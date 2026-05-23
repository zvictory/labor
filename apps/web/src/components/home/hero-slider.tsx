'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, ArrowRight } from 'lucide-react';

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
      {/* Slides Container */}
      <div className="relative h-[80vh] min-h-[550px] w-full md:h-[88vh]">
        {slides.map((slide, idx) => (
          <div
            key={idx}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              idx === current ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
            }`}
          >
            {/* Background Image - Spanning 100% full bleed */}
            <div className="absolute inset-0 overflow-hidden group">
              <div className="absolute inset-0 bg-ink/10 dark:bg-ink/20 z-10 mix-blend-multiply" />
              <Image
                src={slide.image}
                alt={slide.headline}
                fill
                priority={idx === 0}
                className="object-cover transition-transform duration-[8000ms] ease-out group-hover:scale-105"
                sizes="100vw"
              />
            </div>

            {/* Content Card Overlay - Floating Editorial Glassmorphic Box */}
            <div className="absolute bottom-24 left-6 right-6 md:bottom-28 md:left-16 lg:left-24 max-w-sm md:max-w-lg bg-bone/50 dark:bg-ink/50 backdrop-blur-md p-8 md:p-12 border border-border/80 shadow-2xl z-20 space-y-4 md:space-y-6 transition-all duration-300">
              <span className="text-[10px] md:text-xs uppercase tracking-[0.4em] text-brass animate-fade-in font-bold block">
                {slide.tagline}
              </span>
              <h1 className="font-display text-4xl leading-[1.1] text-ink dark:text-bone md:text-5xl lg:text-6xl">
                {slide.headline}
              </h1>
              <p className="max-w-md text-xs md:text-sm text-ink-muted dark:text-stone-400 font-sans leading-relaxed">
                {slide.sub}
              </p>
              <div className="pt-2">
                <Link
                  href={slide.href}
                  className="inline-flex h-11 items-center bg-ink dark:bg-bone dark:text-ink px-6 md:px-8 text-[10px] md:text-xs font-semibold uppercase tracking-widest text-bone hover:bg-brass dark:hover:bg-brass transition-all duration-300 transform hover:translate-x-1"
                >
                  {slide.cta}
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Arrows - Placed beautifully on the bottom-right */}
      <div className="absolute bottom-8 right-6 md:right-16 lg:right-24 z-30 flex items-center gap-3">
        <button
          onClick={prevSlide}
          className="flex h-10 w-10 items-center justify-center border border-border bg-bone/90 dark:bg-stone-900/90 text-ink dark:text-bone backdrop-blur-sm hover:bg-brass hover:text-white dark:hover:bg-brass transition-all"
          aria-label="Previous slide"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <button
          onClick={nextSlide}
          className="flex h-10 w-10 items-center justify-center border border-border bg-bone/90 dark:bg-stone-900/90 text-ink dark:text-bone backdrop-blur-sm hover:bg-brass hover:text-white dark:hover:bg-brass transition-all"
          aria-label="Next slide"
        >
          <ArrowRight className="h-4 w-4" />
        </button>

        {/* Indicators */}
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
