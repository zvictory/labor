'use server';

// Admin: send a Telegram announcement (lib/telegram/broadcast). Admin role
// only — it reaches every customer who talks to the bot. Plain form post; the
// outcome comes back to the page as ?sent=<id> or ?error=<code>.

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { isAdmin, requireStaff } from '@/lib/admin/guard';
import { startBroadcast } from '@/lib/telegram/broadcast';

// Telegram allows 4096 characters; the /stop footer needs room.
const MAX = 3500;
const optional = z
  .string()
  .trim()
  .max(MAX, 'too_long')
  .transform((v) => (v ? v : undefined));

const schema = z.object({
  ru: z.string().trim().min(1, 'ru_required').max(MAX, 'too_long'),
  uz: optional,
  en: optional,
  confirm: z.literal('on', { errorMap: () => ({ message: 'confirm_required' }) }),
});

export async function sendBroadcast(formData: FormData): Promise<void> {
  const user = await requireStaff();
  const locale = String(formData.get('locale') ?? 'ru');
  const base = `/${locale}/admin/broadcast`;
  if (!isAdmin(user)) redirect(`${base}?error=admin_only`);

  const parsed = schema.safeParse({
    ru: String(formData.get('ru') ?? ''),
    uz: String(formData.get('uz') ?? ''),
    en: String(formData.get('en') ?? ''),
    confirm: formData.get('confirm') ?? '',
  });
  if (!parsed.success) redirect(`${base}?error=${parsed.error.issues[0]?.message ?? 'invalid'}`);

  const { ru, uz, en } = parsed.data;
  const result = await startBroadcast(
    { ru, ...(uz ? { uz } : {}), ...(en ? { en } : {}) },
    user.email ?? user.name ?? `user:${user.id}`,
  );
  revalidatePath('/[locale]/admin/broadcast', 'page');
  redirect(result.ok ? `${base}?sent=${result.id}` : `${base}?error=${result.error}`);
}
