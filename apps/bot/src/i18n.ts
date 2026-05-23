type LocaleStrings = Record<string, string>;
type Catalog = Record<'ru' | 'en' | 'uz' | 'uzc', LocaleStrings>;

const catalog: Catalog = {
  ru: {
    'start.welcome':
      'Добро пожаловать в *Labor* — нишевый парфюм Узбекистана.\n\nОткройте каталог в мини-приложении или выберите команду ниже.',
    'menu.open': '🛍 Открыть Labor',
    'menu.catalog': '🌿 Каталог',
    'menu.cart': '🛒 Корзина',
    'menu.orders': '📦 Мои заказы',
    'menu.help': 'ℹ️ Помощь',
    'menu.channel': '📢 Наш канал',
    'menu.lang': '🌐 Язык',
    'help.text':
      'Labor — нишевый парфюмерный бутик. Доставка по всему Узбекистану.\n\n• Каталог и заказы — через мини-приложение\n• Поддержка — @labor_support',
    'lang.choose': 'Выберите язык:',
    'lang.set': 'Язык сохранён: {lang}',
    'order.paid': '✅ Оплата прошла. Заказ №{number}.\nСумма: {total} UZS',
    'order.shipped': '📦 Заказ №{number} передан в доставку ({provider}).',
    'order.delivered': '✨ Заказ №{number} доставлен. Оставьте отзыв в приложении!',
    'campaign.broadcast': '🎁 *{title}*\n\n{description}\n\nДействует до {ends_at}.',
    'unknown': 'Не понимаю команду. Откройте мини-приложение или /help.',
  },
  en: {
    'start.welcome':
      'Welcome to *Labor* — niche perfumery from Uzbekistan.\n\nOpen the mini-app or use commands below.',
    'menu.open': '🛍 Open Labor',
    'menu.catalog': '🌿 Catalog',
    'menu.cart': '🛒 Cart',
    'menu.orders': '📦 My orders',
    'menu.help': 'ℹ️ Help',
    'menu.channel': '📢 Our channel',
    'menu.lang': '🌐 Language',
    'help.text': 'Labor — niche perfumery. Delivery across Uzbekistan.\n\n• Catalog & orders — in the mini-app\n• Support — @labor_support',
    'lang.choose': 'Choose language:',
    'lang.set': 'Language saved: {lang}',
    'order.paid': '✅ Payment received. Order #{number}.\nTotal: {total} UZS',
    'order.shipped': '📦 Order #{number} shipped via {provider}.',
    'order.delivered': '✨ Order #{number} delivered. Leave a review in the app!',
    'campaign.broadcast': '🎁 *{title}*\n\n{description}\n\nValid until {ends_at}.',
    'unknown': "I don't understand. Open the mini-app or /help.",
  },
  uz: {
    'start.welcome': '*Labor* — Oʻzbekiston niche parfyumeriyasi.\n\nMini-ilovani oching yoki quyidagi buyruqlardan foydalaning.',
    'menu.open': '🛍 Labor’ni ochish',
    'menu.catalog': '🌿 Katalog',
    'menu.cart': '🛒 Savat',
    'menu.orders': '📦 Buyurtmalarim',
    'menu.help': 'ℹ️ Yordam',
    'menu.channel': '📢 Kanalimiz',
    'menu.lang': '🌐 Til',
    'help.text': 'Labor — niche parfyum. Oʻzbekiston boʻylab yetkazib berish.\n\n• Katalog va buyurtma — mini-ilovada\n• Aloqa — @labor_support',
    'lang.choose': 'Tilni tanlang:',
    'lang.set': 'Til saqlandi: {lang}',
    'order.paid': '✅ Toʻlov qabul qilindi. Buyurtma №{number}.\nJami: {total} UZS',
    'order.shipped': '📦 №{number} buyurtma yetkazishga uzatildi ({provider}).',
    'order.delivered': '✨ №{number} buyurtma yetkazildi. Ilovada sharh qoldiring!',
    'campaign.broadcast': '🎁 *{title}*\n\n{description}\n\n{ends_at} gacha amal qiladi.',
    'unknown': 'Buyruq tushunarsiz. /help yoki mini-ilovani oching.',
  },
  uzc: {
    'start.welcome': '*Labor* — Ўзбекистон ниче парфюмерияси.\n\nМини-иловани очинг ёки буйруқлардан фойдаланинг.',
    'menu.open': '🛍 Labor’ни очиш',
    'menu.catalog': '🌿 Каталог',
    'menu.cart': '🛒 Сават',
    'menu.orders': '📦 Буюртмаларим',
    'menu.help': 'ℹ️ Ёрдам',
    'menu.channel': '📢 Каналимиз',
    'menu.lang': '🌐 Тил',
    'help.text': 'Labor — ниче парфюмерия. Ўзбекистон бўйлаб етказиб бериш.\n\n• Каталог ва буюртма — мини-иловада\n• Алоқа — @labor_support',
    'lang.choose': 'Тилни танланг:',
    'lang.set': 'Тил сақланди: {lang}',
    'order.paid': '✅ Тўлов қабул қилинди. Буюртма №{number}.\nЖами: {total} UZS',
    'order.shipped': '📦 №{number} буюртма етказишга узатилди ({provider}).',
    'order.delivered': '✨ №{number} буюртма етказилди. Иловада шарҳ қолдиринг!',
    'campaign.broadcast': '🎁 *{title}*\n\n{description}\n\n{ends_at} гача амал қилади.',
    'unknown': 'Буйруқ тушунарсиз. /help ёки мини-иловани очинг.',
  },
};

export type LocaleKey = keyof Catalog;

export const t = (locale: LocaleKey, key: string, params: Record<string, string | number> = {}): string => {
  const raw = catalog[locale]?.[key] ?? catalog.ru[key] ?? key;
  return Object.entries(params).reduce((acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)), raw);
};

export const detectLocale = (lang: string | undefined): LocaleKey => {
  const v = (lang ?? '').toLowerCase();
  if (v.startsWith('en')) return 'en';
  if (v === 'uz-cyrl' || v === 'uz_cyrl') return 'uzc';
  if (v.startsWith('uz')) return 'uz';
  return 'ru';
};
