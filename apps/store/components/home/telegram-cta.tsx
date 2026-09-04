import { Send, ArrowRight } from 'lucide-react';

// Static Telegram mini-app CTA. Reuses the live bot link. Ported from
// apps/web/src/components/home/telegram-cta.tsx.

type Lang = 'en' | 'ru' | 'uz';

const TELEGRAM_URL = 'https://t.me/labor_uz_bot';

const COPY: Record<Lang, { eyebrow: string; headline: string; sub: string; cta: string }> = {
  ru: {
    eyebrow: 'Telegram mini-app',
    headline: 'Заказывайте прямо в Telegram',
    sub: 'Каталог, подбор и оформление — в один чат. Напишите нам, поможем подобрать аромат за минуту.',
    cta: 'Открыть в Telegram',
  },
  en: {
    eyebrow: 'Telegram mini-app',
    headline: 'Order right inside Telegram',
    sub: 'Catalog, finder and checkout in one chat. Message us and we will match a scent in a minute.',
    cta: 'Open in Telegram',
  },
  uz: {
    eyebrow: 'Telegram mini-app',
    headline: 'Toʻgʻridan-toʻgʻri Telegramda buyurtma bering',
    sub: 'Katalog, tanlov va rasmiylashtirish — bitta chatda. Bizga yozing, bir daqiqada hid tanlaymiz.',
    cta: 'Telegramda ochish',
  },
};

export function TelegramCta({ lang }: { lang: Lang }) {
  const c = COPY[lang];

  return (
    <section className="container py-20">
      <div className="border-border flex flex-col items-start gap-6 border p-10 md:flex-row md:items-center md:justify-between md:p-12">
        <div>
          <span className="text-muted-foreground text-micro flex items-center gap-2 font-mono tracking-[0.28em] uppercase">
            <Send className="h-3.5 w-3.5" />
            {c.eyebrow}
          </span>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.02em] md:text-4xl">
            {c.headline}
          </h2>
          <p className="text-muted-foreground mt-2 max-w-xl text-sm">{c.sub}</p>
        </div>
        <a
          href={TELEGRAM_URL}
          className="group bg-foreground text-background inline-flex h-12 shrink-0 items-center gap-2 px-7 text-xs font-semibold tracking-[0.18em] uppercase transition-transform duration-300 hover:translate-x-1"
        >
          {c.cta}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </a>
      </div>
    </section>
  );
}
