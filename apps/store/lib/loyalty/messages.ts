// What the bot says about the loyalty programme. Plain text: the caller sends
// it without parse_mode, so no value needs escaping.

import { formatUzs } from '@/lib/money';
import type { BotLocale } from '@/lib/telegram/messages';
import { formatCardNumber, type Tier } from '@/lib/loyalty/rules';

const TIER_NAME: Record<Tier, string> = { labor: 'Labor', silver: 'Silver', gold: 'Gold' };

export const tierName = (tier: Tier): string => TIER_NAME[tier];

const day = (date: Date, locale: BotLocale): string =>
  new Intl.DateTimeFormat(locale === 'uz' ? 'uz-Latn-UZ' : locale === 'en' ? 'en-GB' : 'ru-RU', {
    day: 'numeric',
    month: 'long',
    timeZone: 'Asia/Tashkent',
  }).format(date);

export interface CardSummary {
  cardNumber: string;
  tier: Tier;
  available: number;
  accountUrl: string;
}

export const LOYALTY_MESSAGES: Record<
  BotLocale,
  {
    card: (c: CardSummary) => string;
    noCard: (signInUrl: string) => string;
    earned: (amount: number, balance: number) => string;
    birthday: (amount: number, until: Date) => string;
    expiring: (amount: number, on: Date) => string;
  }
> = {
  ru: {
    card: (c) =>
      `Карта Labor ${formatCardNumber(c.cardNumber)}\nУровень: ${tierName(c.tier)}\nБонусы: ${formatUzs(c.available, 'ru')}\n\nПокажите номер на кассе. QR-код и история — в кабинете:\n${c.accountUrl}`,
    noCard: (url) => `Карта Labor появится после входа на сайте:\n${url}`,
    earned: (amount, balance) =>
      `Labor: начислено ${formatUzs(amount, 'ru')} бонусов. На карте ${formatUzs(balance, 'ru')}.`,
    birthday: (amount, until) =>
      `С днём рождения! Labor дарит ${formatUzs(amount, 'ru')} бонусов. Они действуют до ${day(until, 'ru')}.`,
    expiring: (amount, on) =>
      `Labor: ${formatUzs(amount, 'ru')} бонусов сгорят ${day(on, 'ru')}. Успейте потратить их на сайте или в магазине.`,
  },
  uz: {
    card: (c) =>
      `Labor kartasi ${formatCardNumber(c.cardNumber)}\nDaraja: ${tierName(c.tier)}\nBonus: ${formatUzs(c.available, 'uz')}\n\nKassada raqamni koʻrsating. QR-kod va tarix kabinetda:\n${c.accountUrl}`,
    noCard: (url) => `Labor kartasi saytga kirganingizdan keyin paydo boʻladi:\n${url}`,
    earned: (amount, balance) =>
      `Labor: ${formatUzs(amount, 'uz')} bonus yozildi. Kartada ${formatUzs(balance, 'uz')}.`,
    birthday: (amount, until) =>
      `Tugʻilgan kuningiz bilan! Labor sizga ${formatUzs(amount, 'uz')} bonus sovgʻa qiladi. ${day(until, 'uz')} gacha amal qiladi.`,
    expiring: (amount, on) =>
      `Labor: ${formatUzs(amount, 'uz')} bonus ${day(on, 'uz')} kuni yonadi. Uni saytda yoki doʻkonda ishlatib qoling.`,
  },
  en: {
    card: (c) =>
      `Labor card ${formatCardNumber(c.cardNumber)}\nTier: ${tierName(c.tier)}\nBonus: ${formatUzs(c.available, 'en')}\n\nShow the number at the till. The QR code and history are in your account:\n${c.accountUrl}`,
    noCard: (url) => `Your Labor card appears once you sign in on the site:\n${url}`,
    earned: (amount, balance) =>
      `Labor: ${formatUzs(amount, 'en')} bonus added. Your card holds ${formatUzs(balance, 'en')}.`,
    birthday: (amount, until) =>
      `Happy birthday! Labor gives you ${formatUzs(amount, 'en')} in bonus, valid until ${day(until, 'en')}.`,
    expiring: (amount, on) =>
      `Labor: ${formatUzs(amount, 'en')} in bonus expires on ${day(on, 'en')}. Use it on the site or in the shop.`,
  },
};
