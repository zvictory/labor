import { setRequestLocale } from 'next-intl/server';
import { locales, type Locale } from '@/i18n/config';

type Lang = 'en' | 'ru' | 'uz' | 'uzc';
const SUPPORTED_LANGS: readonly Lang[] = ['en', 'ru', 'uz', 'uzc'];
const toLang = (locale: string): Lang =>
  (SUPPORTED_LANGS as readonly string[]).includes(locale) ? (locale as Lang) : 'ru';

type Copy = {
  eyebrow: string;
  title: string;
  lead: string;
  labels: { address: string; hours: string; phone: string; email: string; telegram: string };
};

const COPY: Record<Lang, Copy> = {
  ru: {
    eyebrow: 'Контакты',
    title: 'Свяжитесь с нами',
    lead: 'Шоурум в центре Ташкента. Пишите в Telegram — отвечаем в течение часа.',
    labels: { address: 'Адрес', hours: 'Часы работы', phone: 'Телефон', email: 'Почта', telegram: 'Telegram' },
  },
  en: {
    eyebrow: 'Contacts',
    title: 'Get in touch',
    lead: 'Showroom in central Tashkent. Telegram is the fastest channel — we usually reply within an hour.',
    labels: { address: 'Address', hours: 'Hours', phone: 'Phone', email: 'Email', telegram: 'Telegram' },
  },
  uz: {
    eyebrow: 'Aloqa',
    title: 'Biz bilan bog‘laning',
    lead: 'Toshkent markazidagi shou-rum. Telegramga yozing — odatda bir soat ichida javob beramiz.',
    labels: { address: 'Manzil', hours: 'Ish vaqti', phone: 'Telefon', email: 'Pochta', telegram: 'Telegram' },
  },
  uzc: {
    eyebrow: 'Алоқа',
    title: 'Биз билан боғланинг',
    lead: 'Тошкент марказидаги шоу-рум. Telegramга ёзинг — одатда бир соат ичида жавоб берамиз.',
    labels: { address: 'Манзил', hours: 'Иш вақти', phone: 'Телефон', email: 'Почта', telegram: 'Telegram' },
  },
};

const ADDRESS = {
  ru: 'Ташкент, ул. Шахрисабз, 12, шоурум Labor',
  en: 'Tashkent, 12 Shakhrisabz st., Labor showroom',
  uz: 'Toshkent, Shahrisabz ko‘chasi 12, Labor shou-rumi',
  uzc: 'Тошкент, Шаҳрисабз кўчаси 12, Labor шоу-руми',
} as const;

const HOURS = {
  ru: 'Пн–Сб 10:00–21:00 · Вс 12:00–20:00',
  en: 'Mon–Sat 10:00–21:00 · Sun 12:00–20:00',
  uz: 'Du–Sha 10:00–21:00 · Yak 12:00–20:00',
  uzc: 'Ду–Ша 10:00–21:00 · Як 12:00–20:00',
} as const;

type Props = { params: Promise<{ locale: Locale }> };

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function ContactsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const lang = toLang(locale);
  const c = COPY[lang];

  const rows: readonly { k: string; v: React.ReactNode }[] = [
    { k: c.labels.address, v: ADDRESS[lang] },
    { k: c.labels.hours, v: HOURS[lang] },
    {
      k: c.labels.phone,
      v: (
        <a href="tel:+998951234567" className="hover:text-brass">
          +998 95 123 45 67
        </a>
      ),
    },
    {
      k: c.labels.email,
      v: (
        <a href="mailto:hello@labor.uz" className="hover:text-brass">
          hello@labor.uz
        </a>
      ),
    },
    {
      k: c.labels.telegram,
      v: (
        <a href="https://t.me/labor_uz_bot" className="hover:text-brass">
          @labor_uz_bot
        </a>
      ),
    },
  ];

  return (
    <article className="container max-w-3xl py-16 md:py-24">
      <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-brass">
        {c.eyebrow}
      </span>
      <h1 className="mt-3 font-display text-4xl text-ink dark:text-bone md:text-5xl">
        {c.title}
      </h1>
      <p className="mt-6 text-lg leading-relaxed text-ink dark:text-bone/90">{c.lead}</p>
      <dl className="mt-10 divide-y divide-border border-y border-border">
        {rows.map((r) => (
          <div key={r.k} className="grid grid-cols-1 gap-1 py-4 md:grid-cols-[200px_1fr]">
            <dt className="text-xs uppercase tracking-widest text-ink-muted">{r.k}</dt>
            <dd className="text-base text-ink dark:text-bone">{r.v}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}
