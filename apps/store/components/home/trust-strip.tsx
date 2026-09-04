import Link from 'next/link';
import { ShieldCheck, Truck, CreditCard, Droplets } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// Static trust / authenticity strip. The delivery card links to the (future)
// /delivery route; the rest are informational. Ported from
// apps/web/src/components/home/trust-strip.tsx.

type Lang = 'en' | 'ru' | 'uz';

type Item = { icon: LucideIcon; href?: string };

const ITEMS: Item[] = [
  { icon: ShieldCheck },
  { icon: Truck, href: '/delivery' },
  { icon: CreditCard, href: '/delivery' },
  { icon: Droplets },
];

const COPY: Record<
  Lang,
  { eyebrow: string; headline: string; cards: { title: string; body: string }[] }
> = {
  ru: {
    eyebrow: 'Почему Labor',
    headline: 'Покупать спокойно',
    cards: [
      { title: 'Только оригинал', body: 'Прямые поставки и проверка подлинности каждой партии.' },
      { title: 'Доставка по UZ', body: 'Ташкент в день заказа, регионы — 2–4 дня.' },
      { title: 'Оплата как удобно', body: 'Payme, Click, картой или наличными при получении.' },
      {
        title: 'Пробники и помощь',
        body: 'Возьмите декант, спросите в Telegram — поможем выбрать.',
      },
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
      {
        title: 'Faqat original',
        body: 'Toʻgʻridan-toʻgʻri yetkazib berish va har partiyani tekshirish.',
      },
      { title: 'UZ boʻylab yetkazish', body: 'Toshkentda shu kuni, viloyatlarga 2–4 kun.' },
      { title: 'Qulay toʻlov', body: 'Payme, Click, karta yoki yetkazishda naqd.' },
      {
        title: 'Namuna va yordam',
        body: 'Dekant oling, Telegramda soʻrang — tanlashga yordam beramiz.',
      },
    ],
  },
};

export function TrustStrip({ locale, lang }: { locale: string; lang: Lang }) {
  const c = COPY[lang];

  return (
    <section className="border-border container border-b py-24">
      <div className="mb-12 space-y-1">
        <span className="text-muted-foreground text-micro font-mono tracking-[0.28em] uppercase">
          {c.eyebrow}
        </span>
        <h2 className="font-display text-ink dark:text-bone text-4xl md:text-5xl">{c.headline}</h2>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {c.cards.map((card, i) => {
          const Icon = ITEMS[i]!.icon;
          const href = ITEMS[i]!.href;
          const inner = (
            <>
              <span className="bg-brass-50 text-brass dark:bg-ink/40 mb-4 inline-flex h-11 w-11 items-center justify-center rounded-md">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="text-ink dark:text-bone text-base font-medium">{card.title}</h3>
              <p className="text-ink-muted mt-1.5 text-sm dark:text-stone-400">{card.body}</p>
            </>
          );
          return href ? (
            <Link
              key={card.title}
              href={`/${locale}${href}`}
              className="border-border bg-bone hover:border-foreground dark:bg-ink/20 border p-6 transition-colors"
            >
              {inner}
            </Link>
          ) : (
            <div key={card.title} className="border-border bg-bone dark:bg-ink/20 border p-6">
              {inner}
            </div>
          );
        })}
      </div>
    </section>
  );
}
