// The bot handle was written out in seven places, and two of them were wrong:
// the footer and the product page both linked @labor_uz_bot while production is
// configured as @laborparfum_bot. On a shop whose orders arrive through Telegram
// that is a lost order every time someone follows the link from the page where
// they decided to buy.
//
// The fallback matches what production actually sets, so a missing env var keeps
// the right handle rather than the old one.
export const TELEGRAM_BOT_USERNAME =
  process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'laborparfum_bot';

export const TELEGRAM_URL = `https://t.me/${TELEGRAM_BOT_USERNAME}`;

/** `@handle`, for places that print the name rather than link it. */
export const TELEGRAM_HANDLE = `@${TELEGRAM_BOT_USERNAME}`;
