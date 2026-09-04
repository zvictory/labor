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
    <section className="border-border container border-b py-24">
      <div className="mb-12 flex items-baseline justify-between gap-6">
        <div className="space-y-1">
          <span className="text-muted-foreground text-micro font-mono tracking-[0.28em] uppercase">
            {c.eyebrow}
          </span>
          <h2 className="font-display text-ink dark:text-bone text-4xl md:text-5xl">
            {c.headline}
          </h2>
        </div>
        <p className="text-ink-muted hidden max-w-xs text-sm md:block dark:text-stone-400">
          {c.sub}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {MOODS.map((m, i) => (
          <Link
            key={m.note}
            href={`/${locale}/catalog?note=${m.note}`}
            aria-label={`${c.labels[i]} — ${c.subs[i]}`}
            className="group border-border hover:border-foreground focus-visible:outline-graphite dark:focus-visible:outline-offwhite flex flex-col border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {/* The photograph sits inside the frame, not behind the type. A
                scrim over an image is the one texture the shop has nowhere. */}
            <div className="border-border relative aspect-[4/3] w-full border-b">
              <Image
                src={m.image}
                alt=""
                fill
                sizes="(max-width: 1024px) 50vw, 25vw"
                className="object-cover"
              />
            </div>
            <div className="flex flex-col gap-1 p-4">
              <h3 className="text-lg font-semibold tracking-[-0.01em]">{c.labels[i]}</h3>
              <span className="text-muted-foreground text-micro font-mono tracking-[0.12em] uppercase">
                {c.subs[i]}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
