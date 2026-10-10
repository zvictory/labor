'use server';

// Server actions for "help me choose" requests. A 'use server' module exports
// only async functions; validation and storage live in lib/consult/request.ts.

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { requireStaff } from '@/lib/admin/guard';
import { db } from '@/lib/db';
import { SITE_URL } from '@/lib/seo';
import { consultInputSchema, createConsultRequest, type ConsultResult } from './request';

// On an error the typed values come back, because React resets a form after its
// action runs and the visitor would otherwise retype everything to fix one digit.
type Typed = {
  name: string;
  phone: string;
  message: string;
  company: string;
  quantity: string;
  date: string;
};
export type ConsultFormState = (ConsultResult & { values?: Typed }) | null;

// The corporate form's extra fields, as labelled lines above the visitor's own
// note, so staff read one message in the admin and in Telegram.
const EXTRA_FIELDS = [
  ['company', 'Компания'],
  ['quantity', 'Количество / бюджет'],
  ['date', 'К какой дате'],
] as const;

const composeMessage = (formData: FormData): string | undefined => {
  const lines = EXTRA_FIELDS.flatMap(([field, label]) => {
    const value = String(formData.get(field) ?? '')
      .trim()
      .slice(0, 160);
    return value ? [`${label}: ${value}`] : [];
  });
  const note = String(formData.get('message') ?? '').trim();
  const text = [...lines, note].filter(Boolean).join('\n');
  return text || undefined;
};

/** Storefront form submit (useActionState signature). */
export async function submitConsultRequest(
  _prev: ConsultFormState,
  formData: FormData,
): Promise<ConsultFormState> {
  // Honeypot: a field people never see. A bot that fills it gets a success
  // answer and nothing is stored or sent.
  if (String(formData.get('website') ?? '') !== '') return { ok: true };

  const values: Typed = {
    name: String(formData.get('name') ?? ''),
    phone: String(formData.get('phone') ?? ''),
    message: String(formData.get('message') ?? ''),
    company: String(formData.get('company') ?? ''),
    quantity: String(formData.get('quantity') ?? ''),
    date: String(formData.get('date') ?? ''),
  };

  const parsed = consultInputSchema.safeParse({
    name: formData.get('name') ?? undefined,
    phone: formData.get('phone') ?? '',
    message: composeMessage(formData),
    productSlug: formData.get('productSlug') ?? undefined,
    source: formData.get('source'),
    locale: formData.get('locale'),
  });
  if (!parsed.success) {
    const phoneIssue = parsed.error.issues.some((i) => i.path[0] === 'phone');
    return { ok: false, error: phoneIssue ? 'invalid_phone' : 'unexpected', values };
  }

  const result = await createConsultRequest(parsed.data, SITE_URL);
  return result.ok ? result : { ...result, values };
}

const statusSchema = z.object({
  id: z.coerce.number().int().positive(),
  status: z.enum(['new', 'done']),
});

/** Admin: mark a request handled, or back to new. */
export async function setConsultStatus(formData: FormData): Promise<void> {
  await requireStaff();
  const parsed = statusSchema.safeParse({ id: formData.get('id'), status: formData.get('status') });
  if (!parsed.success) return;

  await db.consultRequest.update({
    where: { id: parsed.data.id },
    data: { status: parsed.data.status },
  });
  revalidatePath('/[locale]/admin/requests', 'page');
}
