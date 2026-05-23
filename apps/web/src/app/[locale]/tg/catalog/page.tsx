import { setRequestLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import Image from 'next/image';
import { listProducts } from '@/lib/api/products';
import { formatUzs } from '@/lib/format';

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; note?: string }>;
}

export default async function TgCatalogPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { q, note } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations('tg.catalog');

  const { data } = await listProducts({ locale, page: 1, q, note });

  return (
    <div className="space-y-4">
      <h1 className="font-serif text-2xl">{t('title')}</h1>
      <form action={`/${locale}/tg/catalog`} className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder={t('searchPlaceholder')}
          className="flex-1 rounded-full border border-[var(--tg-hint-color)]/30 bg-[var(--tg-secondary-bg-color,#fff)] px-4 py-2 text-sm"
        />
      </form>
      <ul className="grid grid-cols-2 gap-3">
        {data.map((p) => (
          <li key={p.id}>
            <Link href={`/${locale}/tg/product/${p.slug}`} className="block space-y-1">
              <div className="relative aspect-square overflow-hidden rounded-lg bg-stone-50">
                <Image src={p.image} alt={p.name} fill sizes="200px" className="object-cover" />
              </div>
              <p className="truncate text-xs uppercase tracking-widest text-[var(--tg-hint-color)]">{p.brand}</p>
              <p className="truncate text-sm">{p.name}</p>
              <p className="text-sm font-medium">{formatUzs(p.price, locale)}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
