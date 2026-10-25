// The Labor deodorant launch page (/[locale]/deodorant): what is known about
// the product, in one place. The page shows only what is filled in here, the
// way lib/store-contact.ts works, so nothing unconfirmed reaches a customer.
//
// Before launch the page collects a waiting list (ConsultRequest, source
// "launch"). Once the product is in the catalogue, set `productSlug` and the
// page shows its price and sends buyers to its product page instead.

import type { LocaleText } from '@/lib/catalog/types';

export interface LaunchProduct {
  /** Catalogue slug once the product is on sale; null keeps the waiting list. */
  productSlug: string | null;
  /** Shown as "on sale from …"; ISO date, null while undecided. */
  launchDate: string | null;
  netWeightG: number;
  notes: { name: string; role: LocaleText; text: LocaleText }[];
  /**
   * Verified product facts only (what the formula is and is not). Each line
   * must be true of the shipped product; the section is hidden while empty.
   */
  facts: LocaleText[];
  /** The full ingredient list (INCI) as printed on the pack; hidden while null. */
  ingredients: string | null;
  image: { src: string; width: number; height: number; alt: LocaleText };
}

export const DEODORANT: LaunchProduct = {
  productSlug: null,
  launchDate: null,
  netWeightG: 28,
  notes: [
    {
      name: 'Bergamot',
      role: { ru: 'Верхняя нота', uz: 'Yuqori nota', en: 'Top note' },
      text: {
        ru: 'Цитрус с горчинкой: яркая, чистая свежесть первых минут.',
        uz: 'Biroz achchiq sitrus: ilk daqiqalardagi yorqin, toza tetiklik.',
        en: 'A citrus with a bitter edge: the bright, clean lift of the first minutes.',
      },
    },
    {
      name: 'Hinoki',
      role: { ru: 'База', uz: 'Asos', en: 'Base' },
      text: {
        ru: 'Японский кипарис: чистое, спокойное, чуть смолистое тепло дерева.',
        uz: 'Yapon sarvi: toza, sokin, biroz qatronli yogʻoch iliqligi.',
        en: 'Japanese cypress: clean, calm, slightly resinous warmth of wood.',
      },
    },
  ],
  facts: [],
  ingredients: null,
  image: {
    src: '/launch/deodorant/bergamot-hinoki.jpg',
    width: 853,
    height: 1280,
    alt: {
      ru: 'Дезодорант Labor Bergamot • Hinoki, стик 28 г',
      uz: 'Labor Bergamot • Hinoki dezodoranti, 28 g stik',
      en: 'Labor Bergamot • Hinoki deodorant, 28 g stick',
    },
  },
};
