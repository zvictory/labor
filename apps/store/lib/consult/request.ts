// "Help me choose" requests: validation, storage and the admin notification.
//
// The storefront form posts here through lib/consult/actions.ts. A request is
// written to ConsultRequest first and then announced in the admin Telegram
// chat, best-effort, so staff see it either way.

import { z } from 'zod';

import { db } from '@/lib/db';
import { normalizeUzPhone } from '@/lib/phone';
import { getBot } from '@/lib/telegram/bot';

export const CONSULT_SOURCES = ['product', 'finder', 'contacts', 'corporate'] as const;
export type ConsultSource = (typeof CONSULT_SOURCES)[number];

/** Repeat requests from one number inside this window are acknowledged but not stored again. */
export const REPEAT_WINDOW_MS = 10 * 60 * 1000;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

export const consultInputSchema = z.object({
  name: optionalText(80),
  phone: z
    .string()
    .transform((v, ctx) => {
      const phone = normalizeUzPhone(v);
      if (!phone) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'invalid_phone' });
        return z.NEVER;
      }
      return phone;
    }),
  // Corporate requests fold company, quantity and date into the message.
  message: optionalText(1600),
  productSlug: optionalText(200),
  source: z.enum(CONSULT_SOURCES),
  locale: z.enum(['ru', 'uz', 'en']).catch('ru'),
});

export type ConsultInput = z.infer<typeof consultInputSchema>;

export type ConsultResult = { ok: true } | { ok: false; error: 'invalid_phone' | 'unexpected' };

const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const SOURCE_LABEL: Record<ConsultSource, string> = {
  product: 'страница аромата',
  finder: 'подбор аромата',
  contacts: 'контакты',
  corporate: 'корпоративный заказ',
};

/** The admin chat message, in Russian like the order notifications. */
export const consultAdminMessage = (input: ConsultInput, siteUrl: string): string => {
  const lines = [
    '<b>Заявка на подбор аромата</b>',
    `Телефон: ${escapeHtml(input.phone)}`,
    input.name ? `Имя: ${escapeHtml(input.name)}` : null,
    input.message ? `Сообщение: ${escapeHtml(input.message)}` : null,
    input.productSlug
      ? `Аромат: ${escapeHtml(`${siteUrl}/ru/product/${input.productSlug}`)}`
      : null,
    `Откуда: ${SOURCE_LABEL[input.source]} · ${input.locale}`,
  ];
  return lines.filter(Boolean).join('\n');
};

const notifyAdmin = async (input: ConsultInput, siteUrl: string): Promise<void> => {
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID?.trim();
  if (!chatId) return;
  try {
    await getBot().api.sendMessage(chatId, consultAdminMessage(input, siteUrl), {
      parse_mode: 'HTML',
    });
  } catch (err) {
    console.error('[consult] admin notification failed:', err);
  }
};

/**
 * Store a validated request and tell the admin chat. A second request from the
 * same number within REPEAT_WINDOW_MS is a double submit or an impatient
 * visitor: it is acknowledged without a second row or a second ping.
 */
export const createConsultRequest = async (
  input: ConsultInput,
  siteUrl: string,
): Promise<ConsultResult> => {
  try {
    const recent = await db.consultRequest.findFirst({
      where: { phone: input.phone, createdAt: { gte: new Date(Date.now() - REPEAT_WINDOW_MS) } },
      select: { id: true },
    });
    if (recent) return { ok: true };

    await db.consultRequest.create({
      data: {
        name: input.name ?? null,
        phone: input.phone,
        message: input.message ?? null,
        productSlug: input.productSlug ?? null,
        source: input.source,
        locale: input.locale,
      },
    });
  } catch (err) {
    console.error('[consult] could not store request:', err);
    return { ok: false, error: 'unexpected' };
  }

  await notifyAdmin(input, siteUrl);
  return { ok: true };
};
