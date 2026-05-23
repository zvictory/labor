import { setRequestLocale } from 'next-intl/server';
import { locales, type Locale } from '@/i18n/config';

type Lang = 'en' | 'ru' | 'uz' | 'uzc';
const SUPPORTED_LANGS: readonly Lang[] = ['en', 'ru', 'uz', 'uzc'];
const toLang = (locale: string): Lang =>
  (SUPPORTED_LANGS as readonly string[]).includes(locale) ? (locale as Lang) : 'ru';

type Section = { heading: string; body: string };
type Copy = {
  eyebrow: string;
  title: string;
  updated: string;
  sections: readonly Section[];
};

const LAST_UPDATED = '2026-05-23';

const COPY: Record<Lang, Copy> = {
  ru: {
    eyebrow: 'Условия',
    title: 'Условия и оферта',
    updated: 'Обновлено',
    sections: [
      { heading: '1. Оферта', body: 'Размещая заказ на сайте labor.uz, вы подтверждаете, что ознакомлены с условиями публичной оферты и согласны с ними. Все товары — оригинальная парфюмерия, поставляемая через официальных дистрибьюторов.' },
      { heading: '2. Заказы и оплата', body: 'Заказ считается принятым после подтверждения менеджером. Оплата — Click, Payme, Uzcard / Humo, либо наличными при доставке по Ташкенту. Стоимость указана в сумах.' },
      { heading: '3. Доставка', body: 'Сроки и тарифы — на странице «Доставка и оплата». Риск утраты переходит к покупателю с момента вручения.' },
      { heading: '4. Возврат и обмен', body: 'Запечатанный товар возвращается в течение 14 дней. Парфюмерия со снятой пломбой возврату не подлежит на основании постановления о санитарных нормах. Брак заменяется бесплатно.' },
      { heading: '5. Персональные данные', body: 'Мы храним только данные, необходимые для выполнения заказа: имя, телефон, адрес. Не передаём третьим лицам, кроме служб доставки.' },
      { heading: '6. Контакты', body: 'ИП Labor, Ташкент. По всем вопросам — hello@labor.uz или @labor_uz_bot в Telegram.' },
    ],
  },
  en: {
    eyebrow: 'Terms',
    title: 'Terms of service',
    updated: 'Last updated',
    sections: [
      { heading: '1. Public offer', body: 'By placing an order on labor.uz you confirm that you have read and accept these terms. All goods are original fragrances supplied through authorised distributors.' },
      { heading: '2. Orders & payment', body: 'An order is considered placed once confirmed by our team. Payment methods: Click, Payme, Uzcard / Humo, or cash on delivery within Tashkent. Prices are denominated in UZS.' },
      { heading: '3. Shipping', body: 'See "Delivery & Payment" for timing and rates. Risk of loss passes to the buyer on hand-over.' },
      { heading: '4. Returns', body: 'Sealed items may be returned within 14 days. Opened fragrances cannot be returned, in line with hygiene regulations. Defective items are replaced free of charge.' },
      { heading: '5. Personal data', body: 'We store only what is needed to fulfil your order — name, phone, address. We do not share with third parties other than delivery services.' },
      { heading: '6. Contact', body: 'Labor (IP), Tashkent. Reach us at hello@labor.uz or @labor_uz_bot on Telegram.' },
    ],
  },
  uz: {
    eyebrow: 'Shartlar',
    title: 'Foydalanish shartlari',
    updated: 'Yangilangan',
    sections: [
      { heading: '1. Ommaviy oferta', body: 'labor.uz saytida buyurtma berib, siz ushbu shartlar bilan tanishganingizni va ularga rozi ekanligingizni tasdiqlaysiz. Barcha mahsulotlar — rasmiy distribyutorlar orqali yetkazib beriladigan asl parfyumeriya.' },
      { heading: '2. Buyurtma va to‘lov', body: 'Buyurtma menejer tomonidan tasdiqlangandan so‘ng qabul qilingan hisoblanadi. To‘lov: Click, Payme, Uzcard / Humo yoki Toshkent bo‘ylab yetkazib berishda naqd pul. Narxlar so‘mda.' },
      { heading: '3. Yetkazib berish', body: 'Muddat va tariflar — «Yetkazib berish va to‘lov» sahifasida. Yo‘qotish xavfi xaridorga topshirish paytidan o‘tadi.' },
      { heading: '4. Qaytarish', body: 'Muhrlangan mahsulot 14 kun ichida qaytariladi. Muhri ochilgan atir gigiyenik me’yorlar asosida qaytarib olinmaydi. Nuqsonli mahsulot bepul almashtiriladi.' },
      { heading: '5. Shaxsiy ma’lumotlar', body: 'Buyurtmani bajarish uchun zarur ma’lumotlarnigina saqlaymiz: ism, telefon, manzil. Yetkazib berish xizmatlaridan tashqari uchinchi shaxslarga bermaymiz.' },
      { heading: '6. Aloqa', body: 'YeT Labor, Toshkent. Murojaat: hello@labor.uz yoki @labor_uz_bot.' },
    ],
  },
  uzc: {
    eyebrow: 'Шартлар',
    title: 'Фойдаланиш шартлари',
    updated: 'Янгиланган',
    sections: [
      { heading: '1. Оммавий оферта', body: 'labor.uz сайтида буюртма бериб, сиз ушбу шартлар билан танишганингизни ва уларга рози эканлигингизни тасдиқлайсиз. Барча маҳсулотлар — расмий дистрибюторлар орқали етказиб бериладиган асл парфюмерия.' },
      { heading: '2. Буюртма ва тўлов', body: 'Буюртма менежер томонидан тасдиқлангандан сўнг қабул қилинган ҳисобланади. Тўлов: Click, Payme, Uzcard / Humo ёки Тошкент бўйлаб етказиб беришда нақд пул. Нархлар сўмда.' },
      { heading: '3. Етказиб бериш', body: 'Муддат ва тарифлар — «Етказиб бериш ва тўлов» саҳифасида. Йўқотиш хавфи харидорга топшириш пайтидан ўтади.' },
      { heading: '4. Қайтариш', body: 'Муҳрланган маҳсулот 14 кун ичида қайтарилади. Муҳри очилган атир гигиеник меъёрлар асосида қайтариб олинмайди. Нуқсонли маҳсулот бепул алмаштирилади.' },
      { heading: '5. Шахсий маълумотлар', body: 'Буюртмани бажариш учун зарур маълумотларнигина сақлаймиз: исм, телефон, манзил. Етказиб бериш хизматларидан ташқари учинчи шахсларга бермаймиз.' },
      { heading: '6. Алоқа', body: 'ЯТ Labor, Тошкент. Мурожаат: hello@labor.uz ёки @labor_uz_bot.' },
    ],
  },
};

type Props = { params: Promise<{ locale: Locale }> };

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function TermsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const c = COPY[toLang(locale)];

  return (
    <article className="container max-w-3xl py-16 md:py-24">
      <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-brass">
        {c.eyebrow}
      </span>
      <h1 className="mt-3 font-display text-4xl text-ink dark:text-bone md:text-5xl">
        {c.title}
      </h1>
      <p className="mt-3 text-xs uppercase tracking-widest text-ink-muted">
        {c.updated}: {LAST_UPDATED}
      </p>
      <div className="mt-10 space-y-8">
        {c.sections.map((s) => (
          <section key={s.heading}>
            <h2 className="font-display text-xl text-ink dark:text-bone">{s.heading}</h2>
            <p className="mt-2 text-base leading-relaxed text-ink-muted dark:text-stone-300">
              {s.body}
            </p>
          </section>
        ))}
      </div>
    </article>
  );
}
