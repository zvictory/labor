import { Send, ArrowRight } from 'lucide-react';

// Static Telegram mini-app CTA. Reuses the live bot link. Ported from
// apps/web/src/components/home/telegram-cta.tsx.

type Lang = 'en' | 'ru' | 'uz';

const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'laborparfum_bot';
const TELEGRAM_URL = `https://t.me/${botUsername}`;

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
      <div className="flex flex-col items-start gap-6 bg-[#229ED9] p-10 text-white md:flex-row md:items-center md:justify-between md:p-12">
        <div>
          <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-white/85">
            <Send className="h-3.5 w-3.5" />
            {c.eyebrow}
          </span>
          <h2 className="mt-3 font-display text-3xl text-white md:text-4xl">{c.headline}</h2>
          <p className="mt-2 max-w-xl text-sm text-white/90">{c.sub}</p>
        </div>
        <a
          href={TELEGRAM_URL}
          className="group inline-flex h-12 shrink-0 items-center gap-2 bg-white px-7 text-xs font-semibold uppercase tracking-widest text-[#1c7fb0] transition-transform duration-300 hover:translate-x-1"
        >
          {c.cta}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </a>
      </div>
    </section>
  );
}
