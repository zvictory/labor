import type { Prisma } from '@prisma/client';

import { copiedProfileSlugs, listingSlug } from './product-formats';

import { db } from '@/lib/db';
import { canonicalNoteSlug, noteSlugVariants } from '@/lib/catalog/note-aliases';
import { decodeLocaleRecord, resolveLocaleText } from '@/lib/catalog/locale';
import { resolveNoteImage } from '@/lib/catalog/taxonomy-images';
import type { NoteDTO } from '@/lib/catalog/types';

export { NOTE_ICON_FILES } from './media-manifest';

// Read retained source rows too: their old translated names remain searchable
// after memberships have moved to the canonical row.
const noteSelect = {
  slug: true,
  name: true,
  family: true,
  iconUrl: true,
  description: true,
  productNotes: {
    where: { product: { status: 'active', slug: { notIn: copiedProfileSlugs } } },
    orderBy: { productId: 'asc' },
    select: {
      productId: true,
      product: {
        select: {
          slug: true,
          images: { orderBy: { position: 'asc' }, take: 1, select: { url: true } },
        },
      },
    },
  },
} satisfies Prisma.NoteSelect;

type NoteRow = Prisma.NoteGetPayload<{ select: typeof noteSelect }>;

const toNotes = (rows: NoteRow[], locale: string): NoteDTO[] => {
  const groups = new Map<string, NoteRow[]>();
  for (const row of rows) {
    const slug = canonicalNoteSlug(row.slug);
    const group = groups.get(slug) ?? [];
    group.push(row);
    groups.set(slug, group);
  }
  return [...groups].map(([slug, group]) => {
    const row = group.find((candidate) => candidate.slug === slug) ?? group[0]!;
    const links = group.flatMap((candidate) => candidate.productNotes);
    const names = group.flatMap((candidate) => {
      const record = decodeLocaleRecord(candidate.name);
      return record
        ? Object.values(record).filter((value): value is string => typeof value === 'string')
        : [resolveLocaleText(candidate.name, locale)];
    });
    return {
      slug,
      name: resolveLocaleText(row.name, locale),
      searchTerms: [...new Set([...noteSlugVariants(slug), ...names])],
      image: resolveNoteImage({
        slug,
        iconUrl: row.iconUrl,
        productImageUrls: links.flatMap(({ product }) => product.images.map(({ url }) => url)),
      }),
      ...(row.family ? { family: row.family } : {}),
      ...(row.iconUrl ? { icon_url: row.iconUrl } : {}),
      product_count: new Set(
        links.map(({ productId, product }) =>
          product.slug ? listingSlug(product.slug) : productId,
        ),
      ).size,
      description: resolveLocaleText(row.description, locale),
    };
  });
};

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
      orderBy: { slug: 'asc' },
      select: noteSelect,
    });

    if (rows.length === 0) {
      return FALLBACK_NOTES;
    }

    return toNotes(rows, locale)
      .filter((note) => note.product_count > 0)
      .sort((a, b) => b.product_count - a.product_count || a.slug.localeCompare(b.slug))
      .slice(0, options?.take);
  } catch (err) {
    console.error('[catalog/notes] DB query failed:', err);
    return FALLBACK_NOTES;
  }
};

export const getNote = async (slug: string, locale: string): Promise<NoteDTO | null> => {
  const rows = await db.note.findMany({
    where: { slug: { in: noteSlugVariants(slug) } },
    select: noteSelect,
  });

  return toNotes(rows, locale)[0] ?? null;
};
