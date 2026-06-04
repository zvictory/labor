export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { setRequestLocale } from 'next-intl/server';
import { PageIntro } from '@/components/page-intro';
import { getCatalogMap } from '@/lib/api/catalog-map';
import { CatalogSankey } from '@/components/catalog-map/catalog-sankey';

interface Props {
  params: Promise<{ locale: string }>;
}

const COPY = {
  en: {
    eyebrow: 'Catalog map',
    title: 'Perfumes → notes, day/night',
    intro:
      'A live Sankey map of perfume names connected to their notes and day/night use. Brand nodes are intentionally hidden so the fragrance structure stays readable.',
    back: 'Back to shop',
    products: 'Perfumes',
    notes: 'Notes',
    links: 'Perfume-note links',
    dayNight: 'Day/night data',
    missingNotes: 'Missing notes',
    empty: 'No catalog relationships are available yet.',
  },
  ru: {
    eyebrow: 'Карта каталога',
    title: 'Ароматы → ноты, день/ночь',
    intro:
      'Живая Sankey-карта: названия ароматов связаны с нотами и использованием днём/ночью. Бренды скрыты, чтобы структура аромата читалась лучше.',
    back: 'Назад в каталог',
    products: 'Ароматы',
    notes: 'Ноты',
    links: 'Связи аромат-нота',
    dayNight: 'День/ночь',
    missingNotes: 'Без нот',
    empty: 'Связи каталога пока недоступны.',
  },
  uz: {
    eyebrow: 'Katalog xaritasi',
    title: 'Atirlar → notalar, kun/tun',
    intro:
      'Atir nomlarini notalar va kun/tun ishlatish profili bilan bog‘laydigan jonli Sankey xaritasi. Tuzilma oson o‘qilishi uchun brendlar yashirildi.',
    back: 'Katalogga qaytish',
    products: 'Atirlar',
    notes: 'Notalar',
    links: 'Atir-nota aloqalari',
    dayNight: 'Kun/tun',
    missingNotes: 'Notasiz',
    empty: 'Katalog aloqalari hozircha mavjud emas.',
  },
} as const;

type Lang = keyof typeof COPY;

const toLang = (locale: string): Lang => (locale in COPY ? (locale as Lang) : 'en');

export default async function CatalogMapPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const copy = COPY[toLang(locale)];
  const response = await getCatalogMap(locale);
  const { stats, graph } = response.data;

  const statCards = [
    [copy.products, stats.products],
    [copy.notes, stats.notes],
    [copy.links, stats.product_note_links],
    [copy.dayNight, stats.products_with_day_night],
    [copy.missingNotes, stats.products_missing_notes],
  ] as const;

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-6 py-4 md:py-6">
      <PageIntro
        eyebrow={copy.eyebrow}
        title={copy.title}
        lead={copy.intro}
        action={
          <Link
            href={`/${locale}/shop`}
            className="text-brass text-[10px] font-bold tracking-[0.24em] uppercase hover:opacity-70"
          >
            {copy.back}
          </Link>
        }
      />

      <section
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
        aria-label="Catalog relationship audit"
      >
        {statCards.map(([label, value]) => (
          <div
            key={label}
            className="border-border/80 bg-bone rounded-xl border p-4 dark:bg-[#1A1714]/30"
          >
            <p className="text-ink-muted text-[10px] font-semibold tracking-[0.24em] uppercase dark:text-stone-400">
              {label}
            </p>
            <p className="text-ink dark:text-bone mt-2 font-sans text-2xl font-bold">{value}</p>
          </div>
        ))}
      </section>

      {graph.nodes.length > 0 && graph.edges.length > 0 ? (
        <CatalogSankey graph={graph} />
      ) : (
        <p className="text-ink-muted text-center text-sm dark:text-stone-400">{copy.empty}</p>
      )}
    </main>
  );
}
