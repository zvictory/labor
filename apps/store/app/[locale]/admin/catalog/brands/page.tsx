// Admin taxonomy — brands. Simple list + inline create/edit via the generic
// TaxonomyTable. Brand.name is a plain String (not per-locale); description/story
// are out of scope for this quick editor.

import { requireStaff } from '@/lib/admin/guard';
import { listAdminBrands } from '@/lib/admin/catalog-queries';
import { upsertBrand, deleteBrand, type ActionResult } from '@/lib/admin/catalog-actions';
import {
  TaxonomyTable,
  type FieldDef,
  type RowValues,
} from '@/components/admin/catalog/taxonomy-table';

const FIELDS: FieldDef[] = [
  { key: 'slug', label: 'Slug', kind: 'text', required: true, column: true },
  { key: 'name', label: 'Название', kind: 'text', required: true, column: true },
  { key: 'country', label: 'Страна', kind: 'text', column: true },
  { key: 'niche', label: 'Нишевый', kind: 'boolean', column: true },
  { key: 'active', label: 'Активен', kind: 'boolean', column: true },
];

async function submit(id: number | undefined, values: RowValues): Promise<ActionResult> {
  'use server';
  return upsertBrand({
    ...(id ? { id } : {}),
    slug: String(values.slug ?? ''),
    name: String(values.name ?? ''),
    country: String(values.country ?? ''),
    niche: Boolean(values.niche),
    active: Boolean(values.active),
  });
}

async function remove(id: number): Promise<ActionResult> {
  'use server';
  return deleteBrand(id);
}

export default async function AdminBrandsPage() {
  await requireStaff();
  const brands = await listAdminBrands();

  const rows = brands.map((b) => ({
    id: b.id,
    productCount: b.productCount,
    values: {
      slug: b.slug,
      name: b.name,
      country: b.country,
      niche: b.niche,
      active: b.active,
    },
  }));

  return (
    <TaxonomyTable
      title="Бренды"
      fields={FIELDS}
      rows={rows}
      onSubmit={submit}
      onDelete={remove}
      emptyValues={{ slug: '', name: '', country: '', niche: false, active: true }}
    />
  );
}
