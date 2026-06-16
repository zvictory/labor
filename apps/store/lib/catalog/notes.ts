import { db } from '@/lib/db';
import { resolveLocaleText } from '@/lib/catalog/locale';
import type { NoteDTO } from '@/lib/catalog/types';

const noteSelect = {
  slug: true,
  name: true,
  family: true,
  iconUrl: true,
  _count: { select: { productNotes: true } },
};

type NoteRow = {
  slug: string;
  name: unknown;
  family: string | null;
  iconUrl: string | null;
  _count: { productNotes: number };
};

const toNote = (row: NoteRow, locale: string): NoteDTO => ({
  slug: row.slug,
  name: resolveLocaleText(row.name, locale),
  ...(row.family ? { family: row.family } : {}),
  ...(row.iconUrl ? { icon_url: row.iconUrl } : {}),
  product_count: row._count.productNotes,
});

export const getNotes = async (locale: string): Promise<NoteDTO[]> => {
  const rows = await db.note.findMany({
    orderBy: { slug: 'asc' },
    select: noteSelect,
  });

  return rows.map((row) => toNote(row, locale));
};

export const getNote = async (slug: string, locale: string): Promise<NoteDTO | null> => {
  const row = await db.note.findUnique({
    where: { slug },
    select: noteSelect,
  });

  return row ? toNote(row, locale) : null;
};
