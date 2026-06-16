import Link from 'next/link';
import Image from 'next/image';

// Mood tiles backed by real catalog note slugs — each links to the live
// /catalog?note=<slug> filter and uses the real note art shipped in
// public/notes. Ported from apps/web/src/components/home/mood-browser.tsx.

type Lang = 'en' | 'ru' | 'uz';

// note slug must exist in public/notes/<slug>.png AND be a real catalog facet.
type Mood = { note: string; image: string };

const MOODS: Mood[] = [
  { note: 'musk', image: '/notes/musk.png' },
  { note: 'rose', image: '/notes/rose.png' },
  { note: 'bergamot', image: '/notes/bergamot.png' },
  { note: 'sandalwood', image: '/notes/sandalwood.png' },
];

const COPY: Record<
  Lang,
  { eyebrow: string; headline: string; sub: string; labels: string[]; subs: string[] }
> = {
  ru: {
    eyebrow: 'По настроению',
    headline: 'Выберите состояние',
    sub: 'Ароматы — это эмоция. Начните с того, как вы хотите себя чувствовать.',
    labels: ['Чистый', 'Чувственный', 'Свежий', 'Тёплый'],
    subs: ['мускус, бумага', 'роза, амбра', 'цитрус, чай', 'дерево, ваниль'],
  },
  en: {
    eyebrow: 'By mood',
    headline: 'Choose a feeling',
    sub: 'Fragrance is emotion. Start with how you want to feel.',
    labels: ['Clean', 'Sensual', 'Fresh', 'Warm'],
    subs: ['musk, paper', 'rose, amber', 'citrus, tea', 'wood, vanilla'],
  },
  uz: {
    eyebrow: 'Kayfiyat boʻyicha',
    headline: 'Holatni tanlang',
    sub: 'Hid — bu his. Oʻzingizni qanday his qilishni xohlashingizdan boshlang.',
    labels: ['Toza', 'Hissiy', 'Yangi', 'Iliq'],
    subs: ['muskus, qogʻoz', 'atirgul, ambra', 'sitrus, choy', 'yogʻoch, vanil'],
  },
};

export function MoodBrowser({ locale, lang }: { locale: string; lang: Lang }) {
  const c = COPY[lang];

  return (
    <section className="container border-b border-border py-24">
      <div className="mb-12 flex items-baseline justify-between gap-6">
        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-brass">
            {c.eyebrow}
          </span>
          <h2 className="font-display text-4xl text-ink dark:text-bone md:text-5xl">
            {c.headline}
          </h2>
        </div>
        <p className="hidden max-w-xs text-sm text-ink-muted dark:text-stone-400 md:block">
          {c.sub}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {MOODS.map((m, i) => (
          <Link
            key={m.note}
            href={`/${locale}/catalog?note=${m.note}`}
            aria-label={`${c.labels[i]} — ${c.subs[i]}`}
            className="group relative flex aspect-[3/4] flex-col justify-end overflow-hidden border border-border/60 p-5 transition-colors duration-500 hover:border-brass/60"
          >
            <div className="absolute inset-0 z-0">
              <Image
                src={m.image}
                alt={c.labels[i]!}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 25vw"
                className="object-cover grayscale transition-all duration-700 ease-out group-hover:scale-105 group-hover:grayscale-0"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent opacity-85 transition-opacity duration-500 group-hover:opacity-75" />
            </div>
            <div className="relative z-10">
              <h3 className="font-display text-2xl text-bone">{c.labels[i]}</h3>
              <span className="text-[11px] tracking-wide text-stone-300">{c.subs[i]}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
