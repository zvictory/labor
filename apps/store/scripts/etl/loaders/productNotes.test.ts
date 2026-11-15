import { describe, expect, it, vi } from 'vitest';
const { query, upsert } = vi.hoisted(() => ({ query: vi.fn(), upsert: vi.fn() }));
vi.mock('@/lib/db', () => ({ db: { productNote: { upsert } } }));
vi.mock('../source', () => ({ query }));
import { loadProductNotes } from './productNotes';

interface Membership {
  productId: number;
  noteId: number;
  pyramidLayer: string;
  position: number;
}
interface Upsert {
  where: { productId_noteId_pyramidLayer: Omit<Membership, 'position'> };
  create: Membership;
  update: { position: number };
}

describe('ProductNote alias imports', () => {
  it('updates existing heart memberships without creating middle rows and repeats deterministically', async () => {
    const rows = [
      { spree_product_id: '1', note_slug: 'gaiac', pyramid_layer: 'heart', position: 1 },
      { spree_product_id: '1', note_slug: 'guaiac-wood', pyramid_layer: 'heart', position: 8 },
      { spree_product_id: '1', note_slug: 'guaiac-wood', pyramid_layer: 'base', position: 6 },
      { spree_product_id: '1', note_slug: 'gaiac', pyramid_layer: 'base', position: 3 },
      { spree_product_id: '2', note_slug: 'gaiac', pyramid_layer: 'base', position: 0 },
    ];
    const existing: Membership = { productId: 100, noteId: 10, pyramidLayer: 'heart', position: 9 };
    const state = new Map<string, Membership>([
      [JSON.stringify({ productId: 100, noteId: 10, pyramidLayer: 'heart' }), existing],
    ]);
    upsert.mockImplementation(async ({ where, create, update }: Upsert) => {
      const key = JSON.stringify(where.productId_noteId_pyramidLayer);
      state.set(key, state.has(key) ? { ...create, ...update } : create);
    });
    query.mockResolvedValueOnce(rows).mockResolvedValueOnce([...rows].reverse());
    const products = new Map([[1, 100]]);
    const notes = new Map([
      ['gaiac', 10],
      ['guaiac-wood', 10],
    ]);
    await loadProductNotes(products, notes);
    expect(upsert).toHaveBeenCalledTimes(2);
    expect(state.size).toBe(2);
    expect([...state.values()].some(({ pyramidLayer }) => pyramidLayer === 'middle')).toBe(false);
    const first = [...state.values()];
    expect(first).toEqual(
      expect.arrayContaining([
        { productId: 100, noteId: 10, pyramidLayer: 'heart', position: 1 },
        { productId: 100, noteId: 10, pyramidLayer: 'base', position: 3 },
      ]),
    );
    await loadProductNotes(products, notes);
    expect(upsert).toHaveBeenCalledTimes(4);
    expect([...state.values()]).toEqual(first);
  });
});
