import type { Prisma } from '@prisma/client';

import { db } from '@/lib/db';
import { resolveLocaleText } from '@/lib/catalog/locale';
import { resolveNoteImage } from '@/lib/catalog/taxonomy-images';
import type { NoteDTO } from '@/lib/catalog/types';

export { NOTE_ICON_FILES } from './media-manifest';

const noteSelect = {
  slug: true,
  name: true,
  family: true,
  iconUrl: true,
  description: true,
  productNotes: {
    orderBy: { productId: 'asc' },
    select: {
      product: {
        select: {
          images: { orderBy: { position: 'asc' }, take: 1, select: { url: true } },
        },
      },
    },
  },
  _count: { select: { productNotes: true } },
} satisfies Prisma.NoteSelect;

type NoteRow = {
  slug: string;
  name: unknown;
  family: string | null;
  iconUrl: string | null;
  description: unknown;
  productNotes: { product: { images: { url: string }[] } }[];
  _count: { productNotes: number };
};

const toNote = (row: NoteRow, locale: string): NoteDTO => ({
  slug: row.slug,
  name: resolveLocaleText(row.name, locale),
  image: resolveNoteImage({
    slug: row.slug,
    iconUrl: row.iconUrl,
    productImageUrls: row.productNotes.flatMap(({ product }) =>
      product.images.map(({ url }) => url),
    ),
  }),
  ...(row.family ? { family: row.family } : {}),
  ...(row.iconUrl ? { icon_url: row.iconUrl } : {}),
  product_count: row._count.productNotes,
  description: resolveLocaleText(row.description, locale),
});

const FALLBACK_NOTES: NoteDTO[] = [
  {
    slug: 'sandalwood',
    name: 'Sandalwood',
    family: 'woody',
    image: '/notes/sandalwood.png',
    product_count: 30,
  },
  { slug: 'rose', name: 'Rose', family: 'floral', image: '/notes/rose.png', product_count: 36 },
  {
    slug: 'bergamot',
    name: 'Bergamot',
    family: 'citrus',
    image: '/notes/bergamot.png',
    product_count: 24,
  },
  {
    slug: 'black-tea',
    name: 'Black Tea',
    family: 'aromatic',
    image: '/notes/black-tea.png',
    product_count: 15,
  },
  {
    slug: 'vetiver',
    name: 'Vetiver',
    family: 'woody',
    image: '/notes/vetiver.png',
    product_count: 18,
  },
  { slug: 'musk', name: 'Musk', family: 'musky', image: '/notes/musk.png', product_count: 42 },
];

export const getNotes = async (locale: string, options?: { take?: number }): Promise<NoteDTO[]> => {
  try {
    const rows = await db.note.findMany({
      where: { productNotes: { some: {} } },
      orderBy: [{ productNotes: { _count: 'desc' } }, { slug: 'asc' }],
      take: options?.take,
      select: noteSelect,
    });

    if (rows.length === 0) {
      return FALLBACK_NOTES;
    }

    return rows.map((row) => toNote(row, locale));
  } catch (err) {
    console.error('[catalog/notes] DB query failed:', err);
    return FALLBACK_NOTES;
  }
};

export const getNote = async (slug: string, locale: string): Promise<NoteDTO | null> => {
  const row = await db.note.findUnique({
    where: { slug },
    select: noteSelect,
  });

  return row ? toNote(row, locale) : null;
};
