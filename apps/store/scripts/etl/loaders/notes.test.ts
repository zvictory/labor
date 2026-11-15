import { afterAll, describe, expect, it, vi } from 'vitest';
const { query, upsert, fetchTranslations } = vi.hoisted(() => ({
  query: vi.fn(),
  upsert: vi.fn(),
  fetchTranslations: vi.fn(),
}));
vi.mock('@/lib/db', () => ({ db: { note: { upsert } } }));
vi.mock('../source', async (importOriginal) => {
  vi.stubEnv('SPREE_DATABASE_URL', 'postgresql://unused:unused@127.0.0.1:1/unused');
  return {
    ...(await importOriginal<typeof import('../source')>()),
    query,
    fetchTranslations,
  };
});
afterAll(() => vi.unstubAllEnvs());
vi.mock('../media', () => ({
  migrateTaxonomyMedia: vi.fn(),
  reportTaxonomyMediaFailures: vi.fn(),
}));
import { loadNotes } from './notes';

describe('note ETL aliases', () => {
  it('retains fresh alias metadata while every source slug resolves to its canonical foreign ID', async () => {
    query.mockResolvedValue([
      { id: '1', slug: 'gaiac', name: 'Legacy', family: 'woody', icon_url: null },
      { id: '2', slug: 'guaiac-wood', name: 'Canonical', family: 'woody', icon_url: null },
      { id: '3', slug: 'vanille', name: 'Vanilla', family: null, icon_url: null },
    ]);
    fetchTranslations
      .mockResolvedValueOnce(
        new Map([
          [
            1,
            [
              { locale: 'ru', value: 'Гваяк' },
              { locale: 'uz', value: 'Eski nom' },
            ],
          ],
        ]),
      )
      .mockResolvedValueOnce(new Map([[1, [{ locale: 'ru', value: 'Старое описание' }]]]));
    const ids: Readonly<Record<string, number>> = {
      gaiac: 1,
      'guaiac-wood': 10,
      vanille: 3,
      vanilla: 20,
    };
    upsert.mockImplementation(async ({ where }: { where: { slug: string } }) => ({
      id: ids[where.slug],
    }));
    const map = await loadNotes([]);
    expect(upsert).toHaveBeenCalledTimes(4);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slug: 'gaiac' },
        create: expect.objectContaining({
          slug: 'gaiac',
          name: JSON.stringify({ ru: 'Гваяк', uz: 'Eski nom' }),
          description: JSON.stringify({ ru: 'Старое описание' }),
        }),
      }),
    );
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slug: 'guaiac-wood' },
        create: expect.objectContaining({ name: JSON.stringify({ ru: 'Canonical' }) }),
      }),
    );
    expect(map.get('gaiac')).toBe(10);
    expect(map.get('guaiac-wood')).toBe(10);
    expect(map.get('vanille')).toBe(20);
    expect(map.get('vanilla')).toBe(20);
  });
});
