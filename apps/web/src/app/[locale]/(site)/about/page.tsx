import { setRequestLocale } from 'next-intl/server';
import { PageIntro } from '@/components/page-intro';
import { locales, type Locale } from '@/i18n/config';

type Lang = 'en' | 'ru' | 'uz';
const SUPPORTED_LANGS: readonly Lang[] = ['en', 'ru', 'uz'];
const toLang = (locale: string): Lang =>
  (SUPPORTED_LANGS as readonly string[]).includes(locale) ? (locale as Lang) : 'ru';

type Copy = {
  eyebrow: string;
  title: string;
  lead: string;
  body: readonly string[];
};

const COPY: Record<Lang, Copy> = {
  ru: {
    eyebrow: 'О нас',
    title: 'Лаборатория ароматов',
    lead: 'Labor — концепт-стор нишевой и селективной парфюмерии в Ташкенте.',
    body: [
      'Мы кураторски подбираем ароматы редких и культовых домов — от Le Labo и Maison Margiela до Tom Ford и Memo Paris — и привозим только оригинальные флаконы напрямую от официальных дистрибьюторов.',
      'У нас нет «реплик» и «тестеров с заводов». Каждый аромат сопровождается подробным описанием аккордов, нот и парфюмера, чтобы вы могли выбрать осознанно.',
      'Магазин и шоурум в Ташкенте, доставка по всему Узбекистану.',
    ],
  },
  en: {
    eyebrow: 'About',
    title: 'A laboratory of scent',
    lead: 'Labor is a concept store for niche and selective fragrance in Tashkent.',
    body: [
      'We curate rare and cult houses — from Le Labo and Maison Margiela to Tom Ford and Memo Paris — and source only original bottles directly from authorised distributors.',
      'No replicas, no "factory testers". Every fragrance is documented with its accords, notes, and the perfumer who composed it, so you can choose with intent.',
      'Showroom in Tashkent. Nationwide delivery across Uzbekistan.',
    ],
  },
  uz: {
    eyebrow: 'Biz haqimizda',
    title: 'Atirlar laboratoriyasi',
    lead: 'Labor — Toshkentdagi nisha va selektiv parfyumeriya konsept-do‘koni.',
    body: [
      'Le Labo va Maison Margieladan to Tom Ford va Memo Parisgacha — biz kamyob va kult uylarni saralab tanlaymiz va faqat rasmiy distribyutorlardan keladigan asl flakonlarni taklif qilamiz.',
      'Bizda «replika» yoki «zavod testerlari» yo‘q. Har bir atirning akkordlari, notalari va parfyumeri haqida batafsil ma’lumot beriladi — siz ongli ravishda tanlaysiz.',
      'Shou-rum Toshkentda, butun O‘zbekiston bo‘ylab yetkazib berish.',
    ],
  },
};

type Props = { params: Promise<{ locale: Locale }> };

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const c = COPY[toLang(locale)];

  return (
    <article className="container max-w-3xl py-4 md:py-6">
      <PageIntro eyebrow={c.eyebrow} title={c.title} lead={c.lead} align="left" />
      <div className="text-ink-muted mt-4 space-y-5 text-base leading-relaxed dark:text-stone-300">
        {c.body.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </article>
  );
}
