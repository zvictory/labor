import Link from 'next/link';
import { ShieldCheck, Truck, CreditCard, Droplets } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// Static trust/authenticity strip. The delivery card links to the live
// /delivery route; the rest are informational. No backend dependency.

type Lang = 'en' | 'ru' | 'uz';

type Item = { icon: LucideIcon; href?: string };

const ITEMS: Item[] = [
  { icon: ShieldCheck },
  { icon: Truck, href: '/delivery' },
  { icon: CreditCard, href: '/delivery' },
  { icon: Droplets },
];

const COPY: Record<Lang, { eyebrow: string; headline: string; cards: { title: string; body: string }[] }> = {
  ru: {
    eyebrow: 'Почему Labor',
    headline: 'Покупать спокойно',
    cards: [
      { title: 'Только оригинал', body: 'Прямые поставки и проверка подлинности каждой партии.' },
      { title: 'Доставка по UZ', body: 'Ташкент в день заказа, регионы — 2–4 дня.' },
      { title: 'Оплата как удобно', body: 'Payme, Click, картой или наличными при получении.' },
      { title: 'Пробники и помощь', body: 'Возьмите декант, спросите в Telegram — поможем выбрать.' },
    ],
  },
  en: {
    eyebrow: 'Why Labor',
    headline: 'Buy with confidence',
    cards: [
      { title: 'Authentic only', body: 'Direct supply and authenticity checks on every batch.' },
      { title: 'Delivery across UZ', body: 'Same-day in Tashkent, 2–4 days to regions.' },
      { title: 'Pay your way', body: 'Payme, Click, card, or cash on delivery.' },
      { title: 'Samples & help', body: 'Take a decant, ask on Telegram — we help you choose.' },
    ],
  },
  uz: {
    eyebrow: 'Nega Labor',
    headline: 'Xotirjam xarid qiling',
    cards: [
      { title: 'Faqat original', body: 'Toʻgʻridan-toʻgʻri yetkazib berish va har partiyani tekshirish.' },
      { title: 'UZ boʻylab yetkazish', body: 'Toshkentda shu kuni, viloyatlarga 2–4 kun.' },
      { title: 'Qulay toʻlov', body: 'Payme, Click, karta yoki yetkazishda naqd.' },
      { title: 'Namuna va yordam', body: 'Dekant oling, Telegramda soʻrang — tanlashga yordam beramiz.' },
    ],
  },
};

export function TrustStrip({ locale, lang }: { locale: string; lang: Lang }) {
  const c = COPY[lang];

  return (
    <section className="container border-b border-border py-24">
      <div className="mb-12 space-y-1">
        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-brass">{c.eyebrow}</span>
        <h2 className="font-display text-4xl text-ink dark:text-bone md:text-5xl">{c.headline}</h2>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {c.cards.map((card, i) => {
          const Icon = ITEMS[i]!.icon;
          const href = ITEMS[i]!.href;
          const inner = (
            <>
              <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-md bg-brass-50 text-brass dark:bg-ink/40">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="text-base font-medium text-ink dark:text-bone">{card.title}</h3>
              <p className="mt-1.5 text-sm text-ink-muted dark:text-stone-400">{card.body}</p>
            </>
          );
          return href ? (
            <Link
              key={card.title}
              href={`/${locale}${href}`}
              className="border border-border bg-bone p-6 transition-colors hover:border-brass/60 dark:bg-ink/20"
            >
              {inner}
            </Link>
          ) : (
            <div key={card.title} className="border border-border bg-bone p-6 dark:bg-ink/20">
              {inner}
            </div>
          );
        })}
      </div>
    </section>
  );
}
