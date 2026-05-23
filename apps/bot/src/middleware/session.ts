import { Context } from 'grammy';
import type { SessionFlavor } from 'grammy';
import type { LocaleKey } from '../i18n.js';

export interface LaborSession {
  locale: LocaleKey;
  ordersOpened: number;
}

export type LaborContext = Context & SessionFlavor<LaborSession>;

export const initialSession = (): LaborSession => ({
  locale: 'ru',
  ordersOpened: 0,
});
