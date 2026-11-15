import { beforeEach, describe, expect, it, vi } from 'vitest';
const { findMany } = vi.hoisted(() => ({ findMany: vi.fn() }));
vi.mock('@/lib/db', () => ({ db: { product: { findMany } } }));
import { copiedProfileSlugs } from './product-formats';
import { listProducts, toProductNote } from './products';

beforeEach(() => {
  findMany.mockResolvedValue([]);
  vi.clearAllMocks();
});
describe('saved note filters', () => {
  it.each(['gaiac', 'guaiac-wood'])(
    'preserves all memberships for %s before and after migration',
    async (note) => {
      await listProducts({ locale: 'ru', note });
      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: 'active',
            slug: { notIn: copiedProfileSlugs },
            notes: { some: { note: { slug: { in: ['guaiac-wood', 'gaiac'] } } } },
          },
        }),
      );
    },
  );
  it('emits canonical detail links for legacy memberships', () => {
    expect(
      toProductNote({ slug: 'gaiac', name: { ru: 'Гваяк' }, family: null, iconUrl: null }, 'ru')
        .slug,
    ).toBe('guaiac-wood');
  });
});
