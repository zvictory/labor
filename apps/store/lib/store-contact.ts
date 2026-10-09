// The shop's public contact details, in one place: the footer, the contacts
// page and its schema.org record all read from here.
//
// Every field is optional and the UI shows only the ones that are set. None
// are filled in yet on purpose. The old apps/web contacts page carried a
// placeholder phone (+998 95 123 45 67) and an address nobody confirmed, and a
// wrong number on a shop that takes orders by phone is worse than none.
// Telegram is always shown; it comes from lib/telegram.

import type { LocaleText } from '@/lib/catalog/types';

export interface StoreContact {
  /** Display form, e.g. `+998 71 200 00 00`. The tel: link is derived from it. */
  phone: string | null;
  email: string | null;
  /** Handle without @. */
  instagram: string | null;
  address: LocaleText | null;
  hours: LocaleText | null;
  /** A 2GIS or Yandex Maps link to the pickup point. */
  mapUrl: string | null;
}

export const STORE_CONTACT: StoreContact = {
  phone: null,
  email: null,
  instagram: null,
  address: null,
  hours: null,
  mapUrl: null,
};

/** `+998 71 200-00-00` → `tel:+998712000000`. */
export const telHref = (phone: string): string => `tel:${phone.replace(/[^\d+]/g, '')}`;

export const instagramUrl = (handle: string): string =>
  `https://instagram.com/${handle.replace(/^@/, '')}`;
