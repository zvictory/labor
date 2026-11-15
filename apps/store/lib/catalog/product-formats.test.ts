import { describe, expect, it } from 'vitest';
import {
  collapseVolumeListings,
  copiedProfileSlugs,
  getSeparateFormat,
  relatedFormatSlugs,
  volumeGroup,
} from './product-formats';

describe('catalogued formats', () => {
  it('groups My Way EDP sizes while keeping the Labor shower gel separate', () => {
    expect(volumeGroup('my-way-50-ml')).toEqual(['my-way', 'my-way-50-ml']);
    expect(volumeGroup('my-way-300-gr')).toBeUndefined();
    expect(getSeparateFormat('my-way-50-ml')).toBeUndefined();
    expect(getSeparateFormat('my-way-300-gr')?.size).toEqual({ amount: 300, unit: 'g' });
    expect(relatedFormatSlugs('my-way')).toEqual(['my-way-300-gr']);
    expect(copiedProfileSlugs).toContain('my-way-300-gr');
    expect(copiedProfileSlugs).not.toContain('my-way-50-ml');
  });

  it('counts verified sizes once before pagination and preserves other concentrations', () => {
    const products = [
      { slug: 'perfume-50', id: 2, price: 240000 },
      { slug: 'perfume-edt', id: 3, price: 100000 },
      { slug: 'perfume-10', id: 1, price: 160000 },
    ];
    const groups = [['perfume-10', 'perfume-50']] as const;
    expect(collapseVolumeListings(products, groups)).toEqual([products[1], products[2]]);
    expect(collapseVolumeListings(products.slice(0, 1), groups)).toEqual([products[0]]);
  });
});
