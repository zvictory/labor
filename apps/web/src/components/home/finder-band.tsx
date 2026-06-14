import Link from 'next/link';
import { Sparkles, ArrowRight } from 'lucide-react';

// Static marketing band. Injects the prototype's "scent finder leads" idea
// without modifying HeroSlider. Links to the live /find-your-perfume route.
// Component-local per-locale copy, matching the page.tsx convention.

type Lang = 'en' | 'ru' | 'uz';

type Copy = {
  eyebrow: string;
  headline: string;
  sub: string;
  cta: string;
  steps: string[];
};

const COPY: Record<Lang, Copy> = {
  ru: {
    eyebrow: 'Подбор аромата',
    headline: 'Не можете выбрать? Аромат можно подобрать словами.',
    sub: 'Запах нельзя понюхать онлайн — поэтому мы спрашиваем о настроении, поводе, нотах и интенсивности, и предлагаем точные варианты.',
    cta: 'Пройти подбор',
    steps: ['Настроение', 'Повод', 'Ноты', 'Сезон', 'Интенсивность'],
  },
  en: {
    eyebrow: 'Scent finder',
    headline: "Can't choose? A scent can be found in words.",
    sub: "You can't smell a website — so we ask about mood, occasion, notes and intensity, and return precise matches.",
    cta: 'Take the finder',
    steps: ['Mood', 'Occasion', 'Notes', 'Season', 'Intensity'],
  },
  uz: {
    eyebrow: 'Hid tanlash',
    headline: 'Tanlay olmayapsizmi? Hidni soʻzlar bilan topish mumkin.',
    sub: 'Hidni onlayn hidlab boʻlmaydi — shuning uchun kayfiyat, sabab, nota va kuch haqida soʻraymiz va aniq variantlar beramiz.',
    cta: 'Tanlovni boshlash',
    steps: ['Kayfiyat', 'Sabab', 'Notalar', 'Fasl', 'Kuchi'],
  },
};

export function FinderBand({ locale, lang }: { locale: string; lang: Lang }) {
  const c = COPY[lang];

  return (
    <section className="bg-ink text-bone">
      <div className="container grid gap-10 py-16 md:grid-cols-[1.1fr_0.9fr] md:items-center md:py-20">
        <div>
          <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-brass-300">
            <Sparkles className="h-3.5 w-3.5" />
            {c.eyebrow}
          </span>
          <h2 className="mt-4 font-display text-3xl leading-tight text-bone md:text-5xl">
            {c.headline}
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-stone-400">{c.sub}</p>
          <Link
            href={`/${locale}/find-your-perfume`}
            className="group mt-8 inline-flex h-12 items-center gap-2 bg-brass px-7 text-xs font-semibold uppercase tracking-widest text-bone transition-all duration-300 hover:bg-brass-400 hover:text-ink"
          >
            {c.cta}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
        <div className="flex flex-wrap gap-2 md:justify-end">
          {c.steps.map((s) => (
            <span
              key={s}
              className="rounded-full border border-bone/20 px-4 py-2 text-xs tracking-wide text-stone-300"
            >
              {s}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
