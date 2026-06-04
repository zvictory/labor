import { setRequestLocale } from 'next-intl/server';
import { PageIntro } from '@/components/page-intro';
import { locales, type Locale } from '@/i18n/config';

type Lang = 'en' | 'ru' | 'uz' | 'uzc';
const SUPPORTED_LANGS: readonly Lang[] = ['en', 'ru', 'uz', 'uzc'];
const toLang = (locale: string): Lang =>
  (SUPPORTED_LANGS as readonly string[]).includes(locale) ? (locale as Lang) : 'ru';

type Section = { heading: string; body: string };
type Copy = {
  eyebrow: string;
  title: string;
  lead: string;
  sections: readonly Section[];
};

const COPY: Record<Lang, Copy> = {
  ru: {
    eyebrow: 'Доставка и оплата',
    title: 'Как мы доставляем',
    lead: 'Доставляем оригинальные ароматы по всему Узбекистану. По Ташкенту — день в день при заказе до 18:00.',
    sections: [
      {
        heading: 'По Ташкенту',
        body: 'Курьерская доставка в день заказа при оформлении до 18:00. Стоимость — 25 000 сум, бесплатно при заказе от 1 500 000 сум.',
      },
      {
        heading: 'По регионам',
        body: 'BTS и Yandex.Доставка по всем городам Узбекистана, 1–3 рабочих дня. Тариф рассчитывается при оформлении заказа.',
      },
      {
        heading: 'Оплата',
        body: 'Click, Payme, Uzcard / Humo, наличными при получении в Ташкенте. После предоплаты вы получите электронный чек.',
      },
      {
        heading: 'Возврат',
        body: 'Запечатанный товар можно вернуть в течение 14 дней. Распечатанный парфюм возврату не подлежит по санитарным нормам.',
      },
    ],
  },
  en: {
    eyebrow: 'Delivery & Payment',
    title: 'How we deliver',
    lead: 'Original fragrances shipped across Uzbekistan. Tashkent same-day for orders placed before 6 pm.',
    sections: [
      {
        heading: 'Within Tashkent',
        body: 'Same-day courier for orders placed before 6 pm. 25,000 UZS, free over 1,500,000 UZS.',
      },
      {
        heading: 'Regional',
        body: 'BTS and Yandex.Delivery to every city in Uzbekistan, 1–3 business days. Rate calculated at checkout.',
      },
      {
        heading: 'Payment',
        body: 'Click, Payme, Uzcard / Humo, or cash on delivery in Tashkent. You receive an electronic receipt after prepayment.',
      },
      {
        heading: 'Returns',
        body: 'Sealed items can be returned within 14 days. Opened fragrances cannot be returned for hygiene reasons.',
      },
    ],
  },
  uz: {
    eyebrow: 'Yetkazib berish va to‘lov',
    title: 'Qanday yetkazib beramiz',
    lead: 'Asl atirlarni butun O‘zbekiston bo‘ylab yetkazib beramiz. Toshkent bo‘ylab 18:00 gacha bo‘lgan buyurtmalar shu kunning o‘zida yetkaziladi.',
    sections: [
      {
        heading: 'Toshkent bo‘ylab',
        body: '18:00 gacha berilgan buyurtmalar shu kunning o‘zida kuryer orqali yetkaziladi. Narxi — 25 000 so‘m, 1 500 000 so‘mdan yuqori buyurtmalar uchun bepul.',
      },
      {
        heading: 'Viloyatlarga',
        body: 'O‘zbekistonning barcha shaharlariga BTS va Yandex.Dostavka orqali 1–3 ish kuni ichida. Tarif buyurtma rasmiylashtirishda hisoblanadi.',
      },
      {
        heading: 'To‘lov',
        body: 'Click, Payme, Uzcard / Humo yoki Toshkentda yetkazib berishda naqd pul. Oldindan to‘lovdan keyin elektron chek olasiz.',
      },
      {
        heading: 'Qaytarish',
        body: 'Muhrlangan mahsulotni 14 kun ichida qaytarish mumkin. Ochilgan atir gigiyenik sabablarga ko‘ra qaytarib olinmaydi.',
      },
    ],
  },
  uzc: {
    eyebrow: 'Етказиб бериш ва тўлов',
    title: 'Қандай етказиб берамиз',
    lead: 'Асл атирларни бутун Ўзбекистон бўйлаб етказиб берамиз. Тошкент бўйлаб 18:00 гача бўлган буюртмалар шу куннинг ўзида етказилади.',
    sections: [
      {
        heading: 'Тошкент бўйлаб',
        body: '18:00 гача берилган буюртмалар шу куннинг ўзида курьер орқали етказилади. Нархи — 25 000 сўм, 1 500 000 сўмдан юқори буюртмалар учун бепул.',
      },
      {
        heading: 'Вилоятларга',
        body: 'Ўзбекистоннинг барча шаҳарларига BTS ва Yandex.Доставка орқали 1–3 иш куни ичида. Тариф буюртма расмийлаштиришда ҳисобланади.',
      },
      {
        heading: 'Тўлов',
        body: 'Click, Payme, Uzcard / Humo ёки Тошкентда етказиб беришда нақд пул. Олдиндан тўловдан кейин электрон чек оласиз.',
      },
      {
        heading: 'Қайтариш',
        body: 'Муҳрланган маҳсулотни 14 кун ичида қайтариш мумкин. Очилган атир гигиеник сабабларга кўра қайтариб олинмайди.',
      },
    ],
  },
};

type Props = { params: Promise<{ locale: Locale }> };

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function DeliveryPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const c = COPY[toLang(locale)];

  return (
    <article className="container max-w-3xl py-4 md:py-6">
      <PageIntro eyebrow={c.eyebrow} title={c.title} lead={c.lead} align="left" />
      <div className="mt-4 space-y-8">
        {c.sections.map((s) => (
          <section key={s.heading}>
            <h2 className="font-display text-ink dark:text-bone text-xl">{s.heading}</h2>
            <p className="text-ink-muted mt-2 text-base leading-relaxed dark:text-stone-300">
              {s.body}
            </p>
          </section>
        ))}
      </div>
    </article>
  );
}
