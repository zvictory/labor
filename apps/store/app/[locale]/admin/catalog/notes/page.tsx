// Admin taxonomy — fragrance notes. Note.name is per-locale ({ ru, uz, en }); plus
// family (grouping) and iconUrl. Inline create/edit via the generic TaxonomyTable.

import { requireStaff } from '@/lib/admin/guard';
import { listAdminNotes } from '@/lib/admin/catalog-queries';
import { upsertNote, deleteNote, type ActionResult } from '@/lib/admin/catalog-actions';
import {
  TaxonomyTable,
  type FieldDef,
  type RowValues,
} from '@/components/admin/catalog/taxonomy-table';
import type { LocaleText } from '@/lib/catalog/types';

const FIELDS: FieldDef[] = [
  { key: 'slug', label: 'Slug', kind: 'text', required: true, column: true },
  { key: 'name', label: 'Название', kind: 'localeText', required: true, column: true },
  { key: 'family', label: 'Семейство', kind: 'text', column: true },
  { key: 'iconUrl', label: 'Иконка (URL)', kind: 'text' },
];

async function submit(id: number | undefined, values: RowValues): Promise<ActionResult> {
  'use server';
  const name = (values.name as LocaleText) ?? { ru: '' };
  return upsertNote({
    ...(id ? { id } : {}),
    slug: String(values.slug ?? ''),
    name,
    family: String(values.family ?? ''),
    iconUrl: String(values.iconUrl ?? ''),
  });
}

async function remove(id: number): Promise<ActionResult> {
  'use server';
  return deleteNote(id);
}

export default async function AdminNotesPage() {
  await requireStaff();
  const notes = await listAdminNotes();

  const rows = notes.map((n) => ({
    id: n.id,
    productCount: n.productCount,
    values: {
      slug: n.slug,
      name: n.name,
      family: n.family,
      iconUrl: n.iconUrl,
    },
  }));

  return (
    <TaxonomyTable
      title="Ноты"
      fields={FIELDS}
      rows={rows}
      onSubmit={submit}
      onDelete={remove}
      emptyValues={{ slug: '', name: { ru: '' }, family: '', iconUrl: '' }}
    />
  );
}
