import { TELEGRAM_URL } from '@/lib/telegram';

// Static marketing section. No custom-parfum backend route/model yet, so the CTA
// hands off to the Telegram bot. Ported from
// apps/web/src/components/home/custom-parfum-cta.tsx.
//
// The page's only amber, and amber only as a fill under graphite text — the one
// way the colour is allowed on screen. The four steps are set as the label's
// mono rows, numbered on the right like the lines of a formula card.

type Lang = 'en' | 'ru' | 'uz';

const COPY: Record<
  Lang,
  { eyebrow: string; headline: string; sub: string; steps: string[]; cta: string }
> = {
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
    <section className="bg-accent text-accent-foreground">
      <div className="container grid gap-[18px] py-[34px] md:grid-cols-2 md:items-end md:gap-12 md:py-20">
        <div className="flex flex-col gap-[18px]">
          <p className="text-micro font-mono tracking-[0.16em] uppercase">{c.eyebrow}</p>
          <h2 className="text-[28px] leading-[33px] font-semibold tracking-[-0.025em] md:text-5xl md:leading-[1.05]">
            {c.headline}
          </h2>
          <p className="max-w-md font-serif text-base leading-[26px] text-pretty">{c.sub}</p>
        </div>
        <div className="flex flex-col gap-[18px]">
          <ol className="border-graphite/25 border-t pt-3 font-mono text-sm leading-[26px]">
            {c.steps.map((s, i) => (
              <li key={s} className="flex justify-between gap-4">
                <span>{s}</span>
                <span className="tabular-nums">{String(i + 1).padStart(2, '0')}</span>
              </li>
            ))}
          </ol>
          <a
            href={TELEGRAM_URL}
            className="bg-graphite text-offwhite flex min-h-12 items-center justify-center text-sm font-semibold transition-opacity hover:opacity-85"
          >
            {c.cta}
          </a>
        </div>
      </div>
    </section>
  );
}
