// Delivery method registry used by checkout. Kept data-driven so the UI can
// list options and the order can snapshot a method id on Order.deliveryMethod.
//
// Pricing here is the BASE/flat fee in so'm (integer UZS minor units). Courier
// methods may be refined by a live Yandex quote (lib/delivery/yandex.ts) at
// checkout; `quoted` flags methods whose final price comes from the provider.

import type { LocaleText } from '@/lib/catalog/types';
import { isTashkentCity } from '@/lib/delivery/uz-regions';

export type DeliveryMethodId = 'pickup' | 'courier-tashkent' | 'regional';

export interface DeliveryMethod {
  id: DeliveryMethodId;
  label: LocaleText;
  description: LocaleText;
  /// Base fee in so'm (integer UZS minor units). 0 for pickup.
  baseFee: number;
  /// When true, the real price is fetched from a courier quote at checkout and
  /// `baseFee` is only a fallback/minimum.
  quoted: boolean;
  /// Rough delivery estimate, localized.
  eta: LocaleText;
}

export const DELIVERY_METHODS: Record<DeliveryMethodId, DeliveryMethod> = {
  pickup: {
    id: 'pickup',
    label: { ru: 'Самовывоз', uz: 'Olib ketish', en: 'Pickup' },
    description: {
      ru: 'Заберите заказ из нашего пункта выдачи в Ташкенте',
      uz: 'Buyurtmani Toshkentdagi topshirish punktidan oling',
      en: 'Collect your order from our Tashkent pickup point',
    },
    baseFee: 0,
    quoted: false,
    eta: { ru: 'В тот же день', uz: 'Shu kuni', en: 'Same day' },
  },
  'courier-tashkent': {
    id: 'courier-tashkent',
    label: { ru: 'Курьер по Ташкенту', uz: 'Toshkent boylab kuryer', en: 'Tashkent courier' },
    description: {
      ru: 'Доставка курьером в пределах города Ташкента',
      uz: 'Toshkent shahri ichida kuryer yetkazib berish',
      en: 'Courier delivery within Tashkent city',
    },
    baseFee: 30_000,
    quoted: true,
    eta: { ru: '1–2 дня', uz: '1–2 kun', en: '1–2 days' },
  },
  regional: {
    id: 'regional',
    label: { ru: 'Доставка по регионам', uz: 'Viloyatlarga yetkazib berish', en: 'Regional delivery' },
    description: {
      ru: 'Доставка в другие регионы Узбекистана',
      uz: "O'zbekistonning boshqa viloyatlariga yetkazish",
      en: 'Delivery to other regions of Uzbekistan',
    },
    baseFee: 50_000,
    quoted: false,
    eta: { ru: '3–6 дней', uz: '3–6 kun', en: '3–6 days' },
  },
};

/// All methods as a list (stable order: pickup, tashkent, regional).
export const DELIVERY_METHOD_LIST: DeliveryMethod[] = [
  DELIVERY_METHODS.pickup,
  DELIVERY_METHODS['courier-tashkent'],
  DELIVERY_METHODS.regional,
];

/// Resolve a method by id (undefined if unknown — never trust client input).
export function getDeliveryMethod(id: string): DeliveryMethod | undefined {
  return (DELIVERY_METHODS as Record<string, DeliveryMethod | undefined>)[id];
}

/// Methods available for a given destination region. Tashkent city offers all;
/// other regions get pickup + regional (no in-city courier).
export function availableMethodsForRegion(regionName: string | null | undefined): DeliveryMethod[] {
  if (regionName && isTashkentCity(regionName)) {
    return [DELIVERY_METHODS.pickup, DELIVERY_METHODS['courier-tashkent']];
  }
  return [DELIVERY_METHODS.pickup, DELIVERY_METHODS.regional];
}
