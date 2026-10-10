import { describe, expect, it } from 'vitest';

import { deliveryFee, freeDeliveryThreshold } from './free-delivery';

const courier = { id: 'courier-tashkent' as const, baseFee: 30_000 };
const regional = { id: 'regional' as const, baseFee: 50_000 };

describe('freeDeliveryThreshold', () => {
  it('is off unless a positive whole number is set', () => {
    expect(freeDeliveryThreshold(undefined)).toBeNull();
    expect(freeDeliveryThreshold('')).toBeNull();
    expect(freeDeliveryThreshold('0')).toBeNull();
    expect(freeDeliveryThreshold('abc')).toBeNull();
    expect(freeDeliveryThreshold('480000')).toBe(480_000);
  });
});

describe('deliveryFee', () => {
  it('charges the base fee when free delivery is off', () => {
    expect(deliveryFee(courier, 1_000_000, null)).toBe(30_000);
  });
  it('makes the Tashkent courier free from the threshold up', () => {
    expect(deliveryFee(courier, 479_999, 480_000)).toBe(30_000);
    expect(deliveryFee(courier, 480_000, 480_000)).toBe(0);
  });
  it('leaves regional delivery as it is', () => {
    expect(deliveryFee(regional, 1_000_000, 480_000)).toBe(50_000);
  });
});
