// Admin taxonomy — accords. Accord.name is per-locale; colorHex drives the accord
// chip/bar color on the storefront. Inline create/edit via the generic TaxonomyTable.

import { requireStaff } from '@/lib/admin/guard';
import { listAdminAccords } from '@/lib/admin/catalog-queries';
import { upsertAccord, deleteAccord, type ActionResult } from '@/lib/admin/catalog-actions';
import {
  TaxonomyTable,
  type FieldDef,
  type RowValues,
} from '@/components/admin/catalog/taxonomy-table';
import type { LocaleText } from '@/lib/catalog/types';

const FIELDS: FieldDef[] = [
  { key: 'slug', label: 'Slug', kind: 'text', required: true, column: true },
  { key: 'name', label: 'Название', kind: 'localeText', required: true, column: true },
  { key: 'colorHex', label: 'Цвет (hex)', kind: 'color', column: true },
];

async function submit(id: number | undefined, values: RowValues): Promise<ActionResult> {
  'use server';
  const name = (values.name as LocaleText) ?? { ru: '' };
  return upsertAccord({
    ...(id ? { id } : {}),
    slug: String(values.slug ?? ''),
    name,
    colorHex: String(values.colorHex ?? ''),
  });
}

async function remove(id: number): Promise<ActionResult> {
  'use server';
  return deleteAccord(id);
}

export default async function AdminAccordsPage() {
  await requireStaff();
  const accords = await listAdminAccords();

  const rows = accords.map((a) => ({
    id: a.id,
    productCount: a.productCount,
    values: {
      slug: a.slug,
      name: a.name,
      colorHex: a.colorHex,
    },
  }));

  return (
    <TaxonomyTable
      title="Аккорды"
      fields={FIELDS}
      rows={rows}
      onSubmit={submit}
      onDelete={remove}
      emptyValues={{ slug: '', name: { ru: '' }, colorHex: '' }}
    />
  );
}
