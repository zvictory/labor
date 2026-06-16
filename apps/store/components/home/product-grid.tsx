import Link from 'next/link';

import { ProductCard } from '@/components/catalog/product-card';
import type { ProductCardDTO } from '@/lib/catalog/types';

// Titled product grid — the reusable homepage section unit. Pure presentational
// RSC: the page fetches ProductCardDTO[] via the data-access layer and hands them
// in. Renders an eyebrow + display headline, an optional "view all" link, and a
// 2/4-up card grid. Empty input renders a graceful placeholder instead of an
// empty section (keeps the homepage from looking broken pre-ETL).
export function ProductGrid({
  eyebrow,
  title,
  products,
  locale,
  viewAllLabel,
  viewAllHref,
  emptyLabel,
  className,
}: {
  eyebrow: string;
  title: string;
  products: ProductCardDTO[];
  locale: string;
  viewAllLabel?: string;
  viewAllHref?: string;
  emptyLabel: string;
  className?: string;
}) {
  return (
    <section className={`container border-b border-border py-24 ${className ?? ''}`}>
      <div className="mb-12 flex items-baseline justify-between">
        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-brass">
            {eyebrow}
          </span>
          <h2 className="font-display text-4xl text-ink dark:text-bone md:text-5xl">{title}</h2>
        </div>
        {viewAllLabel && viewAllHref && (
          <Link
            href={viewAllHref}
            className="group flex items-center gap-1 text-xs uppercase tracking-widest text-ink-muted transition-all hover:text-brass dark:text-stone-400"
          >
            {viewAllLabel}
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </Link>
        )}
      </div>

      {products.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} locale={locale} />
          ))}
        </div>
      ) : (
        <p className="py-10 text-center text-sm text-ink-muted dark:text-stone-400">{emptyLabel}</p>
      )}
    </section>
  );
}
