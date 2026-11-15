import { beforeEach, describe, expect, it, vi } from 'vitest';
const { findMany } = vi.hoisted(() => ({ findMany: vi.fn() }));
vi.mock('@/lib/db', () => ({ db: { note: { findMany } } }));
import { getNote, getNotes } from './notes';
import { copiedProfileSlugs } from './product-formats';

const row = (slug: string, ids: number[], name = slug) => ({
  slug,
  name: { ru: name, en: slug },
  family: null,
  iconUrl: null,
  description: null,
  productNotes: ids.map((productId) => ({ productId, product: { images: [] } })),
});

beforeEach(() => findMany.mockReset());
describe('canonical note membership', () => {
  it('counts a product once across layers and source aliases before sorting and limiting', async () => {
    findMany.mockResolvedValue([
      row('gaiac', [1, 1, 2], 'Гваяк'),
      row('guaiac-wood', [2, 3], 'Гваяковое дерево'),
      row('rose', [4, 4, 4, 4]),
      row('sandal', []),
    ]);
    const result = await getNotes('ru', { take: 1 });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      slug: 'guaiac-wood',
      name: 'Гваяковое дерево',
      product_count: 3,
    });
    expect(result[0]?.searchTerms).toEqual(expect.arrayContaining(['gaiac', 'Гваяк']));
    expect(findMany.mock.calls[0]?.[0].select.productNotes.where).toEqual({
      product: { status: 'active', slug: { notIn: copiedProfileSlugs } },
    });
    expect(findMany.mock.calls[0]?.[0]).not.toHaveProperty('take');
  });

  it('keeps translated legacy search names after links have migrated', async () => {
    findMany.mockResolvedValue([
      row('gaiac', [], 'Гваяк'),
      row('guaiac-wood', [1], 'Гваяковое дерево'),
    ]);
    const [note] = await getNotes('ru');
    expect(note?.searchTerms).toContain('Гваяк');
    expect(note?.product_count).toBe(1);
  });

  it('resolves a historical detail slug even if only the canonical row exists', async () => {
    findMany.mockResolvedValue([row('guaiac-wood', [1])]);
    expect(await getNote('gaiac', 'en')).toMatchObject({ slug: 'guaiac-wood', product_count: 1 });
    expect(findMany.mock.calls[0]?.[0].where.slug.in).toEqual(['guaiac-wood', 'gaiac']);
  });
});
