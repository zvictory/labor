// Admin product editor. The `[id]` segment doubles as the create route: the
// literal "new" renders just the scalar ProductForm (relation editors need a saved
// product id, so they appear only after the product exists). A numeric id loads the
// full edit shape and mounts every island: notes pyramid, accords, perfumers, and
// the image manager.

import Link from 'next/link';
import { notFound } from 'next/navigation';

import { requireStaff } from '@/lib/admin/guard';
import {
  getAdminProduct,
  listBrandsForSelect,
  listNotesForSelect,
  listAccordsForSelect,
  listPerfumersForSelect,
} from '@/lib/admin/catalog-queries';
import { ProductForm } from '@/components/admin/catalog/product-form';
import { NotesEditor } from '@/components/admin/catalog/notes-editor';
import { AccordsEditor } from '@/components/admin/catalog/accords-editor';
import { PerfumersEditor } from '@/components/admin/catalog/perfumers-editor';
import { ImageManager } from '@/components/admin/catalog/image-manager';

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

const sectionCls = 'rounded-lg border border-border bg-white p-6';
const sectionTitleCls =
  'mb-4 text-muted-foreground font-mono text-micro tracking-[0.28em] uppercase';

export default async function AdminProductEditPage({ params }: PageProps) {
  await requireStaff();
  const { locale, id } = await params;

  const isNew = id === 'new';
  const brands = await listBrandsForSelect();

  if (isNew) {
    return (
      <div className="space-y-6">
        <Breadcrumb locale={locale} label="Новый продукт" />
        <div className={sectionCls}>
          <h2 className={sectionTitleCls}>Основное</h2>
          <ProductForm locale={locale} brands={brands} />
        </div>
        <p className="text-ink-muted text-sm">
          Ноты, аккорды, парфюмеры и изображения станут доступны после создания продукта.
        </p>
      </div>
    );
  }

  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) notFound();

  const [product, noteOptions, accordOptions, perfumerOptions] = await Promise.all([
    getAdminProduct(numericId),
    listNotesForSelect(),
    listAccordsForSelect(),
    listPerfumersForSelect(),
  ]);

  if (!product) notFound();

  return (
    <div className="space-y-6">
      <Breadcrumb locale={locale} label={product.name.ru || product.slug} />

      <div className={sectionCls}>
        <h2 className={sectionTitleCls}>Основное</h2>
        <ProductForm
          locale={locale}
          brands={brands}
          initial={{
            id: product.id,
            slug: product.slug,
            name: product.name,
            description: product.description,
            status: product.status,
            price: product.price,
            gender: product.gender,
            concentration: product.concentration,
            brandId: product.brandId,
          }}
        />
      </div>

      <div className={sectionCls}>
        <h2 className={sectionTitleCls}>Пирамида нот</h2>
        <NotesEditor
          productId={product.id}
          options={noteOptions}
          initial={product.notes.map((n) => ({
            noteId: n.noteId,
            noteName: n.noteName,
            pyramidLayer: n.pyramidLayer,
            position: n.position,
          }))}
        />
      </div>

      <div className={sectionCls}>
        <h2 className={sectionTitleCls}>Аккорды</h2>
        <AccordsEditor
          productId={product.id}
          options={accordOptions}
          initial={product.accords.map((a) => ({
            accordId: a.accordId,
            accordName: a.accordName,
            colorHex: a.colorHex,
            weight: a.weight,
          }))}
        />
      </div>

      <div className={sectionCls}>
        <h2 className={sectionTitleCls}>Парфюмеры</h2>
        <PerfumersEditor
          productId={product.id}
          options={perfumerOptions}
          initialPerfumerIds={product.perfumers.map((p) => p.perfumerId)}
        />
      </div>

      <div className={sectionCls}>
        <h2 className={sectionTitleCls}>Изображения</h2>
        <ImageManager
          productId={product.id}
          images={product.images.map((img) => ({
            id: img.id,
            url: img.url,
            alt: img.alt,
            position: img.position,
          }))}
        />
      </div>
    </div>
  );
}

function Breadcrumb({ locale, label }: { locale: string; label: string }) {
  return (
    <div className="text-ink-muted flex items-center gap-2 text-sm">
      <Link href={`/${locale}/admin/catalog`} className="hover:underline hover:underline-offset-4">
        Продукты
      </Link>
      <span>/</span>
      <span className="text-ink">{label}</span>
    </div>
  );
}
