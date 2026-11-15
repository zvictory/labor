// What the Labor card looks like in Google Wallet: one LoyaltyClass for the
// programme and one LoyaltyObject per member. Pure functions, so the shapes are
// tested; lib/wallet/google/client.ts sends them. Field names follow the
// Google Wallet REST reference (walletobjects/v1).
//
// Texts carry ru as the default and uz and en as translations: the phone shows
// the one that matches its language.

import { formatCardNumber, type Tier } from '@/lib/loyalty/rules';
import { tierName } from '@/lib/loyalty/messages';

type Lang = 'ru' | 'uz' | 'en';
type Texts = Record<Lang, string>;

export const localized = (t: Texts) => ({
  defaultValue: { language: 'ru', value: t.ru },
  translatedValues: [
    { language: 'uz', value: t.uz },
    { language: 'en', value: t.en },
  ],
});

export const classIdFor = (issuerId: string): string => `${issuerId}.labor_loyalty`;
export const objectIdFor = (issuerId: string, cardNumber: string): string =>
  `${issuerId}.member_${cardNumber}`;

/** The card's colour: the shop's ink. */
export const CARD_BACKGROUND = '#121212';

export interface BranchPoint {
  latitude: number;
  longitude: number;
}

export const buildLoyaltyClass = (input: {
  issuerId: string;
  siteUrl: string;
  logoUrl: string;
  /** Branches with coordinates; up to ten, each a geofenced reminder. */
  branches: readonly BranchPoint[];
}) => ({
  id: classIdFor(input.issuerId),
  issuerName: 'Labor',
  programName: 'Labor',
  programLogo: {
    sourceUri: { uri: input.logoUrl },
    contentDescription: localized({ ru: 'Логотип Labor', uz: 'Labor logotipi', en: 'Labor logo' }),
  },
  hexBackgroundColor: CARD_BACKGROUND,
  countryCode: 'UZ',
  homepageUri: { uri: input.siteUrl, description: 'laborparfum.com' },
  reviewStatus: 'UNDER_REVIEW',
  ...(input.branches.length > 0
    ? {
        merchantLocations: input.branches
          .slice(0, 10)
          .map((b) => ({ latitude: b.latitude, longitude: b.longitude })),
      }
    : {}),
});

export interface MemberCard {
  cardNumber: string;
  name: string | null;
  tier: Tier;
  available: number;
  expiringSoon: { amount: number; expiresAt: Date } | null;
}

const MICROS = 1_000_000;

export const buildLoyaltyObject = (input: {
  issuerId: string;
  siteUrl: string;
  member: MemberCard;
}) => {
  const { member } = input;
  const card = formatCardNumber(member.cardNumber);
  return {
    id: objectIdFor(input.issuerId, member.cardNumber),
    classId: classIdFor(input.issuerId),
    state: 'ACTIVE',
    accountId: card,
    // Google suggests at most 20 characters.
    ...(member.name ? { accountName: member.name.slice(0, 20) } : {}),
    loyaltyPoints: {
      label: 'Bonus',
      localizedLabel: localized({ ru: 'Бонусы', uz: 'Bonus', en: 'Bonus' }),
      balance: { money: { micros: String(member.available * MICROS), currencyCode: 'UZS' } },
    },
    secondaryLoyaltyPoints: {
      label: 'Tier',
      localizedLabel: localized({ ru: 'Уровень', uz: 'Daraja', en: 'Tier' }),
      balance: { string: tierName(member.tier) },
    },
    barcode: { type: 'QR_CODE', value: member.cardNumber, alternateText: card },
    textModulesData: member.expiringSoon
      ? [
          {
            id: 'expiring',
            localizedHeader: localized({
              ru: 'Скоро сгорят',
              uz: 'Tez orada yonadi',
              en: 'Expiring soon',
            }),
            localizedBody: localized(expiringTexts(member.expiringSoon)),
            header: 'Expiring soon',
            body: expiringTexts(member.expiringSoon).en,
          },
        ]
      : [],
    linksModuleData: {
      uris: [
        {
          id: 'account',
          uri: `${input.siteUrl}/ru/account?utm_source=wallet&utm_medium=google&utm_campaign=card`,
          localizedDescription: localized({
            ru: 'Кабинет и история',
            uz: 'Kabinet va tarix',
            en: 'Account and history',
          }),
          description: 'Account',
        },
        {
          id: 'shop',
          uri: `${input.siteUrl}/ru/catalog?utm_source=wallet&utm_medium=google&utm_campaign=card`,
          localizedDescription: localized({ ru: 'Каталог', uz: 'Katalog', en: 'Catalog' }),
          description: 'Catalog',
        },
      ],
    },
  };
};

const day = (date: Date, lang: Lang) =>
  new Intl.DateTimeFormat(lang === 'uz' ? 'uz-Latn-UZ' : lang === 'en' ? 'en-GB' : 'ru-RU', {
    day: 'numeric',
    month: 'long',
    timeZone: 'Asia/Tashkent',
  }).format(date);

const sum = (n: number) => n.toLocaleString('ru-RU').replace(/ |,/g, ' ');

const expiringTexts = (e: { amount: number; expiresAt: Date }): Texts => ({
  ru: `${sum(e.amount)} сум — до ${day(e.expiresAt, 'ru')}`,
  uz: `${sum(e.amount)} soʻm — ${day(e.expiresAt, 'uz')} gacha`,
  en: `${sum(e.amount)} UZS — until ${day(e.expiresAt, 'en')}`,
});

/** The fields a sync may change on a saved card: what a PATCH sends. */
export const objectPatch = (full: ReturnType<typeof buildLoyaltyObject>) => ({
  accountName: full.accountName,
  loyaltyPoints: full.loyaltyPoints,
  secondaryLoyaltyPoints: full.secondaryLoyaltyPoints,
  textModulesData: full.textModulesData,
});

/** Claims of the "Add to Google Wallet" link for an object that already exists. */
export const saveLinkClaims = (input: {
  clientEmail: string;
  issuerId: string;
  cardNumber: string;
  origins: string[];
  now: Date;
}) => ({
  iss: input.clientEmail,
  aud: 'google',
  typ: 'savetowallet',
  iat: Math.floor(input.now.getTime() / 1000),
  origins: input.origins,
  payload: {
    loyaltyObjects: [{ id: objectIdFor(input.issuerId, input.cardNumber) }],
  },
});

export const SAVE_URL_BASE = 'https://pay.google.com/gp/v/save/';

/**
 * A message on the back of the card that also rings the phone. Google's
 * guidance: header under 29 characters, body under 80.
 */
export const buildMessage = (input: {
  id: string;
  header: string;
  body: string;
  link?: string | null;
}) => ({
  message: {
    id: input.id,
    header: input.header.slice(0, 60),
    body: input.link ? `${input.body}\n${input.link}` : input.body,
    messageType: 'TEXT_AND_NOTIFY',
  },
});

export const MESSAGE_HEADER_MAX = 29;
export const MESSAGE_BODY_MAX = 80;
