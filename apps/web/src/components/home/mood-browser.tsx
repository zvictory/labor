import Link from 'next/link';

// Static marketing section. Mood is not a backend facet, so each mood maps to a
// real note slug that the live /catalog?note= filter already supports. Gradient
// tiles only — no images/assets, no external hotlinks.

type Lang = 'en' | 'ru' | 'uz';

type Mood = { note: string; gradient: string };

const MOODS: Mood[] = [
  { note: 'musk', gradient: 'from-stone-700 to-stone-900' },
  { note: 'rose', gradient: 'from-rose-900 to-stone-900' },
  { note: 'bergamot', gradient: 'from-emerald-900 to-stone-900' },
  { note: 'sandalwood', gradient: 'from-amber-900 to-stone-900' },
];

const COPY: Record<Lang, { eyebrow: string; headline: string; sub: string; labels: string[]; subs: string[] }> = {
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
          <h2 className="font-display text-4xl text-ink dark:text-bone md:text-5xl">{c.headline}</h2>
        </div>
        <p className="hidden max-w-xs text-sm text-ink-muted dark:text-stone-400 md:block">{c.sub}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {MOODS.map((m, i) => (
          <Link
            key={m.note}
            href={`/${locale}/catalog?note=${m.note}`}
            className={`group relative flex aspect-[3/4] flex-col justify-end overflow-hidden border border-border/60 bg-gradient-to-br ${m.gradient} p-5 transition-transform duration-500 hover:-translate-y-1`}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent" />
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
