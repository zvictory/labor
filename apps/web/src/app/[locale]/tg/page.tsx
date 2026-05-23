import Link from 'next/link';
import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { locales, type Locale } from '@/i18n/config';
import { listProducts } from '@/lib/api/products';
import { formatUzs } from '@/lib/format';

type Props = { params: Promise<{ locale: Locale }> };

export default async function TelegramHome({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const b = await getTranslations('brand');
  const t = await getTranslations('tg.home');

  let products: Awaited<ReturnType<typeof listProducts>>['data'] = [];
  try {
    products = (await listProducts({ locale, page: 1 })).data.slice(0, 8);
  } catch {
    products = [];
  }

  return (
    <div className="space-y-6">
      <header className="pt-2">
        <p className="text-[10px] uppercase tracking-[0.3em] opacity-60">{b('tagline')}</p>
        <h1 className="mt-2 font-display text-4xl leading-none">{b('name')}</h1>
      </header>

      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xs uppercase tracking-widest opacity-70">{t('new')}</h2>
          <Link href={`/${locale}/tg/catalog`} className="text-xs text-[var(--tg-link-color,#0a84ff)]">{t('all')} →</Link>
        </div>
        <ul className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none]">
          {products.map((p) => (
            <li key={p.id} className="w-32 shrink-0">
              <Link href={`/${locale}/tg/product/${p.slug}`} className="space-y-1">
                <div className="relative aspect-square overflow-hidden rounded-lg bg-black/5">
                  <Image src={p.image} alt={p.name} fill sizes="128px" className="object-cover" />
                </div>
                <p className="truncate text-xs uppercase tracking-widest opacity-60">{p.brand}</p>
                <p className="truncate text-xs">{p.name}</p>
                <p className="text-xs font-medium">{formatUzs(p.price, locale)}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}
