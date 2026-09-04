import type { ProductCardDTO } from '@/lib/catalog/types';
import { ProductCard } from '@/components/catalog/product-card';

export function TaxonomyProductGrid({
  products,
  locale,
  emptyLabel,
}: {
  products: ProductCardDTO[];
  locale: string;
  emptyLabel: string;
}) {
  if (products.length === 0) {
    return <p className="py-16 text-center text-sm text-stone-500">{emptyLabel}</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} locale={locale} />
      ))}
    </div>
  );
}
