// Admin taxonomy — perfumers. Perfumer.name is a plain String; bio (per-locale) is
// out of scope for this quick editor. Inline create/edit via the generic TaxonomyTable.

import { requireStaff } from '@/lib/admin/guard';
import { listAdminPerfumers } from '@/lib/admin/catalog-queries';
import {
  upsertPerfumer,
  deletePerfumer,
  type ActionResult,
} from '@/lib/admin/catalog-actions';
import {
  TaxonomyTable,
  type FieldDef,
  type RowValues,
} from '@/components/admin/catalog/taxonomy-table';

const FIELDS: FieldDef[] = [
  { key: 'slug', label: 'Slug', kind: 'text', required: true, column: true },
  { key: 'name', label: 'Имя', kind: 'text', required: true, column: true },
  { key: 'country', label: 'Страна', kind: 'text', column: true },
];

async function submit(id: number | undefined, values: RowValues): Promise<ActionResult> {
  'use server';
  return upsertPerfumer({
    ...(id ? { id } : {}),
    slug: String(values.slug ?? ''),
    name: String(values.name ?? ''),
    country: String(values.country ?? ''),
  });
}

async function remove(id: number): Promise<ActionResult> {
  'use server';
  return deletePerfumer(id);
}

export default async function AdminPerfumersPage() {
  await requireStaff();
  const perfumers = await listAdminPerfumers();

  const rows = perfumers.map((p) => ({
    id: p.id,
    productCount: p.productCount,
    values: {
      slug: p.slug,
      name: p.name,
      country: p.country,
    },
  }));

  return (
    <TaxonomyTable
      title="Парфюмеры"
      fields={FIELDS}
      rows={rows}
      onSubmit={submit}
      onDelete={remove}
      emptyValues={{ slug: '', name: '', country: '' }}
    />
  );
}
