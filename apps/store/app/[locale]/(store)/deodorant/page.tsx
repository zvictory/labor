import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { setRequestLocale } from 'next-intl/server';

import { type Locale } from '@/i18n/config';
import { ConsultForm } from '@/components/consult/consult-form';
import { resolveLocaleText } from '@/lib/catalog/locale';
import { getProduct } from '@/lib/catalog/products';
import { DEODORANT } from '@/lib/launch/deodorant';
import { formatUzs } from '@/lib/money';
import { pageMetadata } from '@/lib/seo';
import { STORE_CONTACT } from '@/lib/store-contact';

// Launch page for the Labor deodorant, built to be the landing page of the
// launch ads (lib/launch/deodorant.ts holds the facts). Before launch it
// collects a waiting list through the consult form (source "launch", seen in
// /admin/requests and the admin Telegram chat, reported to Meta as a Lead).
// Once DEODORANT.productSlug is set, it shows the price and links to the
// product page instead.

type Props = { params: Promise<{ locale: Locale }> };
type Lang = 'ru' | 'uz' | 'en';
const toLang = (l: string): Lang => (l === 'uz' || l === 'en' ? l : 'ru');

const COPY: Record<
  Lang,
  {
    metaTitle: string;
    metaDescription: string;
    eyebrow: string;
    title: string;
    lead: string;
    productLine: string;
    waitCta: string;
    waitNote: string;
    buyCta: string;
    onSaleFrom: (date: string) => string;
    scentTitle: string;
    scentLead: string;
    detailsTitle: string;
    format: [string, string];
    weight: string;
    notes: string;
    atelier: [string, string];
    factsTitle: string;
    ingredientsTitle: string;
    pairTitle: string;
    pairText: string;
    pairFinder: string;
    pairContacts: string;
    useTitle: string;
    useSteps: string[];
    faqTitle: string;
    faq: (o: { date: string | null; phone: string | null; hasIngredients: boolean }) => {
      q: string;
      a: string;
    }[];
    listTitle: string;
    listLead: string;
  }
> = {
  uz: {
    metaTitle: 'Labor dezodoranti — Bergamot • Hinoki',
    metaDescription:
      'Yangi Labor dezodoranti: bergamot tiniqligi va hinoki yogʻochining sokin iliqligi. 28 g stik. Birinchilardan boʻlib xabar oling.',
    eyebrow: 'Yangi · Labor Perfume Atelier',
    title: 'Atelye hidi — endi har kuni siz bilan',
    lead: 'Bergamotning yorqin tiniqligi va hinoki yogʻochining sokin iliqligi: parfyumer yigʻgan kompozitsiya, kundalik parvarish formatida.',
    productLine: 'Dezodorant · Bergamot • Hinoki',
    waitCta: 'Birinchilardan boʻlib olish',
    waitNote: 'Sotuvga chiqqan kuni Telegram yoki qoʻngʻiroq orqali xabar beramiz.',
    buyCta: 'Sotib olish',
    onSaleFrom: (d) => `Sotuvda: ${d}`,
    scentTitle: 'Kompozitsiya',
    scentLead: 'Ikki nota — ikki holat: ertalabki tetiklik va kun davomidagi xotirjamlik.',
    detailsTitle: 'Tafsilotlar',
    format: ['Format', 'Stik'],
    weight: 'Netto',
    notes: 'Notalar',
    atelier: ['Atelye', 'Labor, 2017-yildan'],
    factsTitle: 'Formula haqida',
    ingredientsTitle: 'Tarkibi',
    pairTitle: 'Atiringiz bilan',
    pairText:
      'Sitrus va yogʻoch notalari koʻplab atirlar bilan uygʻunlashadi. Qaysi atiringiz bilan yaxshi juftlashishini birga tanlaymiz.',
    pairFinder: 'Atir tanlash testi',
    pairContacts: 'Filialda sinab koʻrish',
    useTitle: 'Qanday ishlatiladi',
    useSteps: [
      'Toza va quruq teriga surting.',
      'Har bir qoʻltiq ostiga 2–3 marta yetarli.',
      'Ishlatgandan keyin qopqogʻini mahkam yoping.',
      'Shikastlangan yoki tirnalgan teriga surmang.',
    ],
    faqTitle: 'Savollar',
    faq: ({ date, phone, hasIngredients }) => [
      {
        q: 'Qachon sotuvga chiqadi?',
        a: date
          ? `${date} kuni. Roʻyxatga yozilganlarga birinchi boʻlib xabar beramiz.`
          : 'Sanani aniqlashtiryapmiz. Roʻyxatga yoziling — sotuvga chiqqan kuni birinchi boʻlib xabar beramiz.',
      },
      { q: 'Hajmi qancha?', a: `${DEODORANT.netWeightG} g, stik formatida.` },
      {
        q: 'Tarkibi qanday?',
        a: hasIngredients
          ? 'Toʻliq tarkib yuqorida, “Tarkibi” boʻlimida.'
          : 'Toʻliq tarkibni sotuvga chiqishidan oldin shu sahifada eʼlon qilamiz.',
      },
      {
        q: 'Savolim bor — kimga yozay?',
        a: phone
          ? `Qoʻngʻiroq qiling: ${phone}, yoki pastdagi formaga raqamingizni qoldiring.`
          : 'Pastdagi formaga raqamingizni qoldiring — oʻzimiz bogʻlanamiz.',
      },
    ],
    listTitle: 'Birinchilardan boʻlib oling',
    listLead: 'Raqamingizni qoldiring: dezodorant sotuvga chiqqan kuni xabar beramiz.',
  },
  ru: {
    metaTitle: 'Дезодорант Labor — Bergamot • Hinoki',
    metaDescription:
      'Новый дезодорант Labor: свежесть бергамота и спокойное тепло дерева хиноки. Стик 28 г. Узнайте о старте продаж первыми.',
    eyebrow: 'Новинка · Labor Perfume Atelier',
    title: 'Аромат ателье — теперь каждый день',
    lead: 'Яркая свежесть бергамота и спокойное тепло дерева хиноки: композиция парфюмера в формате ежедневного ухода.',
    productLine: 'Дезодорант · Bergamot • Hinoki',
    waitCta: 'Узнать первым',
    waitNote: 'Напишем в Telegram или позвоним в день старта продаж.',
    buyCta: 'Купить',
    onSaleFrom: (d) => `В продаже с ${d}`,
    scentTitle: 'Композиция',
    scentLead: 'Две ноты — два состояния: утренняя бодрость и спокойствие на весь день.',
    detailsTitle: 'Детали',
    format: ['Формат', 'Стик'],
    weight: 'Нетто',
    notes: 'Ноты',
    atelier: ['Ателье', 'Labor, с 2017 года'],
    factsTitle: 'О формуле',
    ingredientsTitle: 'Состав',
    pairTitle: 'С вашим ароматом',
    pairText:
      'Цитрусовая и древесная ноты сочетаются со многими ароматами. Подберём, с каким из ваших он звучит лучше.',
    pairFinder: 'Тест-подбор аромата',
    pairContacts: 'Попробовать в ателье',
    useTitle: 'Как пользоваться',
    useSteps: [
      'Наносите на чистую сухую кожу.',
      'Достаточно 2–3 движений для каждой подмышки.',
      'После использования плотно закройте колпачок.',
      'Не наносите на повреждённую или раздражённую кожу.',
    ],
    faqTitle: 'Вопросы',
    faq: ({ date, phone, hasIngredients }) => [
      {
        q: 'Когда начнутся продажи?',
        a: date
          ? `${date}. Тем, кто в листе ожидания, сообщим первыми.`
          : 'Уточняем дату. Оставьте номер — сообщим первыми в день старта.',
      },
      { q: 'Какой объём?', a: `${DEODORANT.netWeightG} г, в формате стика.` },
      {
        q: 'Какой состав?',
        a: hasIngredients
          ? 'Полный состав — выше, в разделе «Состав».'
          : 'Полный состав опубликуем на этой странице до старта продаж.',
      },
      {
        q: 'Есть вопрос — куда писать?',
        a: phone
          ? `Позвоните: ${phone}, или оставьте номер в форме ниже.`
          : 'Оставьте номер в форме ниже — мы свяжемся с вами.',
      },
    ],
    listTitle: 'Получите одним из первых',
    listLead: 'Оставьте номер: сообщим в день, когда дезодорант появится в продаже.',
  },
  en: {
    metaTitle: 'Labor deodorant — Bergamot • Hinoki',
    metaDescription:
      'The new Labor deodorant: the lift of bergamot and the calm warmth of hinoki wood. 28 g stick. Be the first to know when it is out.',
    eyebrow: 'New · Labor Perfume Atelier',
    title: 'The atelier’s scent, now every day',
    lead: 'The bright lift of bergamot and the calm warmth of hinoki wood: a perfumer’s composition, made for everyday care.',
    productLine: 'Deodorant · Bergamot • Hinoki',
    waitCta: 'Be the first to know',
    waitNote: 'We will message you on Telegram or call on launch day.',
    buyCta: 'Buy now',
    onSaleFrom: (d) => `On sale from ${d}`,
    scentTitle: 'The scent',
    scentLead: 'Two notes, two moods: a morning lift and calm for the rest of the day.',
    detailsTitle: 'Details',
    format: ['Format', 'Stick'],
    weight: 'Net weight',
    notes: 'Notes',
    atelier: ['Atelier', 'Labor, since 2017'],
    factsTitle: 'About the formula',
    ingredientsTitle: 'Ingredients',
    pairTitle: 'With your perfume',
    pairText:
      'Citrus and wood sit well with many perfumes. We will help you find the one it pairs best with.',
    pairFinder: 'Take the scent quiz',
    pairContacts: 'Try it at the atelier',
    useTitle: 'How to use',
    useSteps: [
      'Apply to clean, dry skin.',
      'Two or three swipes per underarm are enough.',
      'Close the cap firmly after use.',
      'Do not apply to broken or irritated skin.',
    ],
    faqTitle: 'Questions',
    faq: ({ date, phone, hasIngredients }) => [
      {
        q: 'When does it go on sale?',
        a: date
          ? `On ${date}. Everyone on the waiting list hears first.`
          : 'We are confirming the date. Leave your number and we will tell you first on launch day.',
      },
      { q: 'How big is it?', a: `${DEODORANT.netWeightG} g, in a stick.` },
      {
        q: 'What is in it?',
        a: hasIngredients
          ? 'The full list is above, under “Ingredients”.'
          : 'We will publish the full ingredient list on this page before launch.',
      },
      {
        q: 'I have a question — who do I ask?',
        a: phone
          ? `Call us on ${phone}, or leave your number in the form below.`
          : 'Leave your number in the form below and we will get in touch.',
      },
    ],
    listTitle: 'Get it among the first',
    listLead: 'Leave your number and we will tell you the day the deodorant goes on sale.',
  },
};

const formatDate = (iso: string, locale: Lang): string =>
  new Intl.DateTimeFormat(locale === 'uz' ? 'uz-Latn-UZ' : locale === 'en' ? 'en-GB' : 'ru-RU', {
    day: 'numeric',
    month: 'long',
    timeZone: 'Asia/Tashkent',
  }).format(new Date(iso));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const c = COPY[toLang(locale)];
  return pageMetadata({
    locale,
    path: '/deodorant',
    title: c.metaTitle,
    description: c.metaDescription,
    images: [DEODORANT.image.src],
    absoluteTitle: true,
  });
}

const eyebrowCls = 'text-label font-mono tracking-[0.2em] uppercase';
const btnCls =
  'inline-flex h-12 items-center justify-center rounded-full px-7 text-sm font-medium tracking-wide transition-opacity hover:opacity-90';

export default async function DeodorantLaunchPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const lang = toLang(locale);
  const c = COPY[lang];
  const d = DEODORANT;

  // On sale once the catalogue has it; a slug that does not resolve keeps the
  // waiting list rather than a broken buy button.
  const product = d.productSlug ? await getProduct(d.productSlug, locale).catch(() => null) : null;
  const date = d.launchDate ? formatDate(d.launchDate, lang) : null;
  const facts = d.facts.map((f) => resolveLocaleText(f, locale));
  const faq = c.faq({ date, phone: STORE_CONTACT.phone, hasIngredients: Boolean(d.ingredients) });

  const primaryCta = product ? (
    <Link href={`/${locale}/product/${product.slug}`} className={`${btnCls} bg-ink text-bone`}>
      {c.buyCta} · {formatUzs(product.price, locale)}
    </Link>
  ) : (
    <a href="#waitlist" className={`${btnCls} bg-ink text-bone`}>
      {c.waitCta}
    </a>
  );

  return (
    <div className="pb-8">
      {/* Hero: the pack on its own cream, the promise beside it. */}
      <section className="bg-[#ede3d9]">
        <div className="container grid items-center gap-6 py-6 md:grid-cols-2 md:gap-16 md:py-20">
          {/* Narrow on a phone so the promise and the button stay above the fold. */}
          <div className="relative mx-auto aspect-[853/1280] w-full max-w-[13rem] overflow-hidden rounded-3xl shadow-[0_30px_60px_-30px_rgba(60,50,40,0.35)] md:max-w-md">
            <Image
              src={d.image.src}
              alt={resolveLocaleText(d.image.alt, locale)}
              fill
              priority
              sizes="(min-width: 768px) 28rem, 13rem"
              className="object-cover"
            />
          </div>
          <div className="space-y-4 text-center md:space-y-6 md:text-left">
            <p className={`${eyebrowCls} text-[#5f6b5a]`}>{c.eyebrow}</p>
            <h1 className="font-display text-ink text-4xl leading-[1.05] tracking-[-0.02em] md:text-6xl">
              {c.title}
            </h1>
            <p className="text-ink-muted mx-auto max-w-md text-base md:mx-0 md:text-lg">{c.lead}</p>
            <p className="text-ink text-sm font-medium">
              {c.productLine} · {d.netWeightG} g
            </p>
            <div className="flex flex-col items-center gap-3 md:items-start">
              {primaryCta}
              <p className="text-ink-muted text-xs">
                {date ? c.onSaleFrom(date) : product ? null : c.waitNote}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The two notes, on the pack's own sage. */}
      <section className="bg-[#a3ad9f] text-[#1d2219]">
        <div className="container space-y-10 py-16 md:py-24">
          <header className="max-w-2xl space-y-3">
            <h2 className="font-display text-3xl tracking-[-0.02em] md:text-5xl">{c.scentTitle}</h2>
            <p className="text-base opacity-80">{c.scentLead}</p>
          </header>
          <div className="grid gap-6 md:grid-cols-2">
            {d.notes.map((n) => (
              <article key={n.name} className="rounded-2xl bg-[#f4f1ea]/70 p-8 backdrop-blur-sm">
                <p className={`${eyebrowCls} opacity-70`}>{resolveLocaleText(n.role, locale)}</p>
                <h3 className="font-display mt-3 text-3xl md:text-4xl">{n.name}</h3>
                <p className="mt-3 text-base opacity-85">{resolveLocaleText(n.text, locale)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Facts from the label, then what the shop has confirmed about the formula. */}
      <section className="container grid gap-12 py-16 md:grid-cols-2 md:py-24">
        <div className="space-y-6">
          <h2 className="font-display text-ink text-3xl tracking-[-0.02em]">{c.detailsTitle}</h2>
          <dl className="divide-border border-border divide-y border-y text-sm">
            {[
              c.format,
              [c.weight, `${d.netWeightG} g`],
              [c.notes, d.notes.map((n) => n.name).join(' • ')],
              c.atelier,
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-6 py-4">
                <dt className="text-ink-muted">{k}</dt>
                <dd className="text-ink text-right font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          {facts.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-ink font-medium">{c.factsTitle}</h3>
              <ul className="text-ink-muted space-y-2 text-sm">
                {facts.map((f) => (
                  <li key={f}>— {f}</li>
                ))}
              </ul>
            </div>
          )}
          {d.ingredients && (
            <div className="space-y-3">
              <h3 className="text-ink font-medium">{c.ingredientsTitle}</h3>
              <p className="text-ink-muted text-xs leading-relaxed">{d.ingredients}</p>
            </div>
          )}
        </div>
        <div className="space-y-6">
          <h2 className="font-display text-ink text-3xl tracking-[-0.02em]">{c.useTitle}</h2>
          <ol className="space-y-4">
            {c.useSteps.map((step, i) => (
              <li key={step} className="flex gap-4">
                <span className="text-ink-muted font-mono text-sm">0{i + 1}</span>
                <span className="text-ink text-base">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* With a perfume: where the atelier and the deodorant meet. */}
      <section className="bg-bone border-border border-y">
        <div className="container flex flex-col items-start gap-6 py-14 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl space-y-3">
            <h2 className="font-display text-ink text-3xl tracking-[-0.02em]">{c.pairTitle}</h2>
            <p className="text-ink-muted text-base">{c.pairText}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/${locale}/find-your-perfume`}
              className={`${btnCls} border-ink text-ink border`}
            >
              {c.pairFinder}
            </Link>
            <Link href={`/${locale}/contacts`} className={`${btnCls} border-ink text-ink border`}>
              {c.pairContacts}
            </Link>
          </div>
        </div>
      </section>

      <section className="container max-w-3xl space-y-6 py-16 md:py-24">
        <h2 className="font-display text-ink text-3xl tracking-[-0.02em]">{c.faqTitle}</h2>
        <div className="divide-border border-border divide-y border-y">
          {faq.map((item) => (
            <details key={item.q} className="group py-5">
              <summary className="text-ink flex cursor-pointer list-none items-center justify-between gap-6 text-base font-medium">
                {item.q}
                <span className="text-ink-muted transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="text-ink-muted mt-3 text-sm">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* The waiting list, until the product is on sale. */}
      {!product && (
        <section id="waitlist" className="scroll-mt-24 bg-[#ede3d9]">
          <div className="container max-w-3xl space-y-6 py-16 md:py-20">
            <header className="space-y-3">
              <h2 className="font-display text-ink text-3xl tracking-[-0.02em] md:text-5xl">
                {c.listTitle}
              </h2>
              <p className="text-ink-muted text-base">{c.listLead}</p>
            </header>
            <ConsultForm locale={locale} source="launch" showHeading={false} />
          </div>
        </section>
      )}
    </div>
  );
}
