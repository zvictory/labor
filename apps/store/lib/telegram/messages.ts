// Localized string maps for the Telegram bot and order notifications.
// Locales: ru (default), uz, en. Keep these plain so they can be HTML-embedded
// after the caller has escaped any dynamic values.

export type BotLocale = 'ru' | 'uz' | 'en';

const SUPPORTED: ReadonlySet<string> = new Set(['ru', 'uz', 'en']);

/// Normalize an arbitrary locale string to a supported BotLocale, defaulting ru.
export function toBotLocale(locale: string | null | undefined): BotLocale {
  return locale && SUPPORTED.has(locale) ? (locale as BotLocale) : 'ru';
}

interface BotStrings {
  start: (storeUrl: string) => string;
  help: string;
  langPrompt: string;
  langSet: string;
  fallback: string;
}

export const BOT_MESSAGES: Record<BotLocale, BotStrings> = {
  ru: {
    start: (url) =>
      `Добро пожаловать в Labor Parfum!\n\nОткройте каталог и оформите заказ:\n${url}\n\nКоманды: /help — помощь, /lang — сменить язык.`,
    help:
      'Labor Parfum — бот.\n\n/start — открыть магазин\n/lang — сменить язык (ru/uz/en)\n/help — это сообщение\n\nУведомления о статусе заказа приходят сюда автоматически.',
    langPrompt: 'Выберите язык:',
    langSet: 'Язык переключён на русский.',
    fallback: 'Не понял команду. Наберите /help для списка команд.',
  },
  uz: {
    start: (url) =>
      `Labor Parfum’ga xush kelibsiz!\n\nKatalogni oching va buyurtma bering:\n${url}\n\nBuyruqlar: /help — yordam, /lang — tilni almashtirish.`,
    help:
      'Labor Parfum — bot.\n\n/start — do‘konni ochish\n/lang — tilni almashtirish (ru/uz/en)\n/help — ushbu xabar\n\nBuyurtma holati haqida bildirishnomalar bu yerga avtomatik keladi.',
    langPrompt: 'Tilni tanlang:',
    langSet: 'Til o‘zbek tiliga o‘zgartirildi.',
    fallback: 'Buyruq tushunilmadi. Buyruqlar ro‘yxati uchun /help.',
  },
  en: {
    start: (url) =>
      `Welcome to Labor Parfum!\n\nBrowse the catalog and place an order:\n${url}\n\nCommands: /help — help, /lang — change language.`,
    help:
      'Labor Parfum bot.\n\n/start — open the store\n/lang — change language (ru/uz/en)\n/help — this message\n\nOrder status notifications arrive here automatically.',
    langPrompt: 'Choose a language:',
    langSet: 'Language switched to English.',
    fallback: 'Unknown command. Type /help for the list of commands.',
  },
};

/// Human-readable order status per locale. Falls back to the raw status string.
const STATUS_LABELS: Record<BotLocale, Record<string, string>> = {
  ru: {
    pending: 'Ожидает оплаты',
    confirmed: 'Подтверждён',
    paid: 'Оплачен',
    shipped: 'Отправлен',
    delivered: 'Доставлен',
    canceled: 'Отменён',
  },
  uz: {
    pending: 'To‘lov kutilmoqda',
    confirmed: 'Tasdiqlangan',
    paid: 'To‘langan',
    shipped: 'Jo‘natilgan',
    delivered: 'Yetkazilgan',
    canceled: 'Bekor qilingan',
  },
  en: {
    pending: 'Awaiting payment',
    confirmed: 'Confirmed',
    paid: 'Paid',
    shipped: 'Shipped',
    delivered: 'Delivered',
    canceled: 'Canceled',
  },
};

export function statusLabel(status: string, locale: BotLocale): string {
  return STATUS_LABELS[locale][status] ?? status;
}

interface NotifyStrings {
  paidTitle: string;
  statusTitle: string;
  orderLabel: string;
  itemsLabel: string;
  totalLabel: string;
  statusFieldLabel: string;
}

export const NOTIFY_MESSAGES: Record<BotLocale, NotifyStrings> = {
  ru: {
    paidTitle: 'Оплата получена ✅',
    statusTitle: 'Статус заказа обновлён',
    orderLabel: 'Заказ',
    itemsLabel: 'Товаров',
    totalLabel: 'Итого',
    statusFieldLabel: 'Статус',
  },
  uz: {
    paidTitle: 'To‘lov qabul qilindi ✅',
    statusTitle: 'Buyurtma holati yangilandi',
    orderLabel: 'Buyurtma',
    itemsLabel: 'Mahsulotlar',
    totalLabel: 'Jami',
    statusFieldLabel: 'Holat',
  },
  en: {
    paidTitle: 'Payment received ✅',
    statusTitle: 'Order status updated',
    orderLabel: 'Order',
    itemsLabel: 'Items',
    totalLabel: 'Total',
    statusFieldLabel: 'Status',
  },
};
