import { Droplets, ArrowRight } from 'lucide-react';

// Static marketing section. There is no custom-parfum backend route/model yet,
// so the CTA hands off to the existing Telegram bot. Phase 2 can replace the
// href with a real inquiry route once the backend flow exists.

type Lang = 'en' | 'ru' | 'uz';

const TELEGRAM_URL = 'https://t.me/labor_uz_bot';

const COPY: Record<Lang, { eyebrow: string; headline: string; sub: string; steps: string[]; cta: string }> = {
  ru: {
    eyebrow: 'Кастомный парфюм',
    headline: 'Аромат, созданный для одного человека',
    sub: 'Консультация, профиль запаха, подбор нот и флакон с подписью. От первой встречи до готового парфюма — около трёх недель.',
    steps: ['Консультация', 'Профиль аромата', 'Композиция и проба', 'Флакон с подписью'],
    cta: 'Написать в Telegram',
  },
  en: {
    eyebrow: 'Custom parfum',
    headline: 'A scent made for one person',
    sub: 'Consultation, scent profile, note selection and a signed bottle. From first meeting to finished perfume — about three weeks.',
    steps: ['Consultation', 'Scent profile', 'Composition & trial', 'Signed bottle'],
    cta: 'Message on Telegram',
  },
  uz: {
    eyebrow: 'Maxsus parfyum',
    headline: 'Bir kishi uchun yaratilgan hid',
    sub: 'Maslahat, hid profili, nota tanlash va imzoli flakon. Birinchi uchrashuvdan tayyor atirgacha — taxminan uch hafta.',
    steps: ['Maslahat', 'Hid profili', 'Kompozitsiya va sinov', 'Imzoli flakon'],
    cta: 'Telegramda yozish',
  },
};

export function CustomParfumCta({ lang }: { lang: Lang }) {
  const c = COPY[lang];

  return (
    <section className="bg-gradient-to-br from-ink to-brass-900 text-bone">
      <div className="container grid gap-12 py-24 md:grid-cols-2 md:items-center">
        <div>
          <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-brass-300">
            <Droplets className="h-3.5 w-3.5" />
            {c.eyebrow}
          </span>
          <h2 className="mt-4 font-display text-4xl leading-tight text-bone md:text-5xl">
            {c.headline}
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-stone-300">{c.sub}</p>
          <a
            href={TELEGRAM_URL}
            className="group mt-8 inline-flex h-12 items-center gap-2 bg-brass px-7 text-xs font-semibold uppercase tracking-widest text-bone transition-all duration-300 hover:bg-brass-400 hover:text-ink"
          >
            {c.cta}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </a>
        </div>
        <ol className="space-y-5">
          {c.steps.map((s, i) => (
            <li key={s} className="flex items-start gap-4">
              <span className="font-display text-2xl text-brass-300">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="pt-1 text-sm text-stone-200">{s}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
