// The shop's public contact details, in one place: the footer, the contacts
// page and its schema.org record all read from here.
//
// Every field is optional and the UI shows only the ones that are set. The
// phone, Instagram and both branch addresses come from the shop's own brief
// (2026-10). Opening hours and map links are not confirmed yet, so they stay
// empty: a wrong number or address on a shop that takes orders by phone is
// worse than none. Telegram is always shown; it comes from lib/telegram.

import type { LocaleText } from '@/lib/catalog/types';

export interface StoreBranch {
  name: LocaleText;
  address: LocaleText;
  /** A 2GIS or Yandex Maps link to the branch. */
  mapUrl: string | null;
}

export interface StoreContact {
  /** Display form, e.g. `+998 71 200 00 00`. The tel: link is derived from it. */
  phone: string | null;
  email: string | null;
  /** Handle without @. */
  instagram: string | null;
  /** Shops that also serve as pickup points, in the order they are listed. */
  branches: StoreBranch[];
  hours: LocaleText | null;
}

export const STORE_CONTACT: StoreContact = {
  phone: '+998 33 180 73 73',
  email: null,
  instagram: 'labor_parfum',
  branches: [
    {
      name: { ru: 'Филиал Ocean', uz: 'Ocean filiali', en: 'Ocean branch' },
      address: {
        ru: 'Ташкент, ул. Шота Руставели, 34',
        uz: 'Toshkent, Shota Rustaveli koʻchasi, 34-uy',
        en: '34 Shota Rustaveli St, Tashkent',
      },
      mapUrl: null,
    },
    {
      name: { ru: 'Филиал Gulzor', uz: 'Gulzor filiali', en: 'Gulzor branch' },
      address: {
        ru: 'Ташкент, ул. Генерала Узакова, 60А',
        uz: 'Toshkent, General Oʻzoqov koʻchasi, 60A-uy',
        en: '60A General Uzakov St, Tashkent',
      },
      mapUrl: null,
    },
  ],
  hours: null,
};

/** `+998 71 200-00-00` → `tel:+998712000000`. */
export const telHref = (phone: string): string => `tel:${phone.replace(/[^\d+]/g, '')}`;

export const instagramUrl = (handle: string): string =>
  `https://instagram.com/${handle.replace(/^@/, '')}`;
