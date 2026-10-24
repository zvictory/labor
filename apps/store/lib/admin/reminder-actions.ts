'use server';

// Admin: send the refill reminders that are due now, without waiting for the
// daily cron (lib/reminders/refill.ts). Admin role only, like announcements.
// The outcome comes back to the page as ?sent=<n>&failed=<n> or ?error=<code>.

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { isAdmin, requireStaff } from '@/lib/admin/guard';
import { sendRefillReminders } from '@/lib/reminders/refill';

export async function sendDueRefillReminders(formData: FormData): Promise<void> {
  const user = await requireStaff();
  const locale = String(formData.get('locale') ?? 'ru');
  const base = `/${locale}/admin/reminders`;
  if (!isAdmin(user)) redirect(`${base}?error=admin_only`);
  if (!process.env.TELEGRAM_BOT_TOKEN) redirect(`${base}?error=no_bot`);

  const result = await sendRefillReminders();
  revalidatePath('/[locale]/admin/reminders', 'page');
  redirect(`${base}?sent=${result.sent}&failed=${result.failed}`);
}
