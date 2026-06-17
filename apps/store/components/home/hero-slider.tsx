'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, ArrowRight, Wind } from 'lucide-react';

interface Slide {
  image: string;
  tagline: string;
  headline: string;
  sub: string;
  cta: string;
  href: string;
  scentFamily: string;
  scentNotes: string[];
}

interface HeroSliderProps {
  slides: Slide[];
}

export function HeroSlider({ slides }: HeroSliderProps) {
  const [current, setCurrent] = useState(0);
  const [progress, setProgress] = useState(0);

  const prevSlide = () => {
    setCurrent((prev) => (prev - 1 + slides.length) % slides.length);
    setProgress(0);
  };

  const nextSlide = () => {
    setCurrent((prev) => (prev + 1) % slides.length);
    setProgress(0);
  };

  useEffect(() => {
    // Client-side mobile redirect backup to bypass static HTML cache
    const isMobile = /mobile|android|iphone|ipad|phone/i.test(navigator.userAgent);
    if (isMobile) {
      const pathSegments = window.location.pathname.split('/');
      const locale = pathSegments[1] || 'ru';
      window.location.replace(`/${locale}/catalog`);
    }
  }, []);

  useEffect(() => {
    setProgress(0);
  }, [current]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const intervalTime = 50; // tick every 50ms for smooth progress bar
    const duration = 8000; // 8 seconds per slide
    const increment = (intervalTime / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setCurrent((c) => (c + 1) % slides.length);
          return 0;
        }
        return prev + increment;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <div className="hidden md:block relative w-full overflow-hidden border-b border-border bg-[#F4F1EC] dark:bg-[#151311]">
      <div className="relative flex h-[80vh] min-h-[600px] w-full flex-col md:h-[85vh] md:flex-row">
        
        {/* Left Column: Premium Typography & Olfactive Details (42% width on desktop) */}
        <div className="relative z-20 flex w-full shrink-0 flex-col justify-between p-8 md:w-[42%] md:p-12 lg:p-16 border-b md:border-b-0 md:border-r border-border bg-[#F4F1EC] dark:bg-[#151311]">
          
          {/* Top tagline / logo accent */}
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-brass" />
            <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-brass">
              Labor Parfum Selective
            </span>
          </div>

          {/* Active slide text contents */}
          <div className="my-auto py-8 space-y-6 md:space-y-8">
            {slides.map((slide, idx) => {
              if (idx !== current) return null;
              return (
                <div
                  key={idx}
                  className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out"
                >
                  <span className="block text-[10px] font-bold uppercase tracking-[0.4em] text-stone-500 dark:text-stone-400">
                    {slide.tagline}
                  </span>
                  
                  <h1 className="font-display text-4xl leading-[1.08] tracking-tight text-ink dark:text-bone sm:text-5xl lg:text-6xl">
                    {slide.headline}
                  </h1>
                  
                  <p className="max-w-md font-sans text-xs leading-relaxed text-ink-muted dark:text-stone-400 md:text-sm">
                    {slide.sub}
                  </p>

                  {/* Scent Profile Widget */}
                  <div className="pt-6 border-t border-border/70 dark:border-stone-800 space-y-3">
                    <div className="flex items-center gap-1.5">
                      <Wind className="h-3.5 w-3.5 text-brass" />
                      <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-brass">
                        Olfactive Profile
                      </span>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-ink dark:text-bone">
                        {slide.scentFamily}
                      </p>
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {slide.scentNotes.map((note) => (
                          <span
                            key={note}
                            className="inline-block rounded-sm bg-ink/5 dark:bg-bone/5 border border-border/40 dark:border-stone-800/60 px-2 py-0.5 text-[9px] uppercase tracking-widest text-ink-muted dark:text-stone-400 font-semibold"
                          >
                            {note}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4">
                    <Link
                      href={slide.href}
                      className="group inline-flex h-12 items-center bg-ink px-8 text-[10px] font-bold uppercase tracking-[0.2em] text-bone transition-all duration-300 hover:bg-brass dark:bg-bone dark:text-ink dark:hover:bg-brass"
                    >
                      <span>{slide.cta}</span>
                      <span className="ml-2 transition-transform duration-300 group-hover:translate-x-1">→</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom indicator & controls */}
          {slides.length > 1 && (
            <div className="flex items-center justify-between border-t border-border/70 dark:border-stone-800 pt-6">
              
              {/* Minimalist Dot Pagination with active linear progress */}
              <div className="flex items-center gap-2.5">
                {slides.map((_, idx) => {
                  const isActive = idx === current;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setCurrent(idx);
                        setProgress(0);
                      }}
                      className={`relative h-1.5 rounded-full overflow-hidden transition-all duration-500 bg-border/40 dark:bg-stone-800 ${
                        isActive ? 'w-12' : 'w-2 hover:bg-stone-400'
                      }`}
                      aria-label={`Go to slide ${idx + 1}`}
                    >
                      {isActive && (
                        <div
                          className="absolute left-0 top-0 h-full bg-brass transition-all duration-75"
                          style={{ width: `${progress}%` }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Slider navigation arrows */}
              <div className="flex items-center gap-2">
                <button
                  onClick={prevSlide}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-border/80 bg-bone/30 text-ink backdrop-blur-sm transition-all hover:bg-brass hover:text-white dark:border-stone-800 dark:bg-stone-900/30 dark:text-bone dark:hover:bg-brass hover:scale-105"
                  aria-label="Previous slide"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={nextSlide}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-border/80 bg-bone/30 text-ink backdrop-blur-sm transition-all hover:bg-brass hover:text-white dark:border-stone-800 dark:bg-stone-900/30 dark:text-bone dark:hover:bg-brass hover:scale-105"
                  aria-label="Next slide"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

            </div>
          )}
        </div>

        {/* Right Column: Visual Showcase (58% width on desktop) */}
        <div className="relative h-[45vh] w-full overflow-hidden md:h-full md:w-[58%]">
          {slides.map((slide, idx) => {
            const isActive = idx === current;
            return (
              <div
                key={idx}
                className={`absolute inset-0 transition-all duration-[1200ms] ease-in-out ${
                  isActive ? 'z-10 opacity-100' : 'pointer-events-none z-0 opacity-0'
                }`}
              >
                <div className="absolute inset-0 z-10 bg-gradient-to-r from-[#F4F1EC]/40 to-transparent dark:from-[#151311]/40 mix-blend-multiply" />
                <Image
                  src={slide.image}
                  alt={slide.headline}
                  fill
                  priority={idx === 0}
                  className={`object-cover transition-transform duration-[8000ms] ease-out ${
                    isActive ? 'scale-100' : 'scale-105'
                  }`}
                  sizes="(max-width: 768px) 100vw, 60vw"
                />
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
