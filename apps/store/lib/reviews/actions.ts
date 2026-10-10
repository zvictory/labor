'use server';

// Review form and admin moderation. A 'use server' module exports only async
// functions; the rules live in lib/reviews/reviews.ts.

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { requireStaff } from '@/lib/admin/guard';
import { getCurrentUserId } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { locales } from '@/i18n/config';
import { reviewInputSchema, saveReview } from './reviews';

export type ReviewFormState =
  | { ok: true }
  | { ok: false; error: 'sign_in' | 'rating' | 'not_a_buyer' | 'unexpected' }
  | null;

/** Storefront: save the signed-in buyer's rating (useActionState signature). */
export async function submitReviewAction(
  _prev: ReviewFormState,
  formData: FormData,
): Promise<ReviewFormState> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: 'sign_in' };

  const productId = Number(formData.get('productId'));
  const slug = String(formData.get('slug') ?? '');
  const locale = String(formData.get('locale') ?? 'ru');
  if (!Number.isInteger(productId) || productId <= 0) return { ok: false, error: 'unexpected' };

  const parsed = reviewInputSchema.safeParse({
    rating: formData.get('rating') ?? '',
    comment: String(formData.get('comment') ?? ''),
  });
  if (!parsed.success) return { ok: false, error: 'rating' };

  try {
    const result = await saveReview(userId, productId, parsed.data);
    if (result === 'not_a_buyer') return { ok: false, error: 'not_a_buyer' };
  } catch (err) {
    console.error('[reviews] save failed:', err);
    return { ok: false, error: 'unexpected' };
  }
  if (/^[a-z0-9-]+$/i.test(slug)) revalidatePath(`/${locale}/product/${slug}`);
  return { ok: true };
}

const moderateSchema = z.object({
  id: z.coerce.number().int().positive(),
  status: z.enum(['published', 'hidden', 'pending']),
});

/** Admin: publish or hide a review text. */
export async function moderateReview(formData: FormData): Promise<void> {
  await requireStaff();
  const parsed = moderateSchema.safeParse({
    id: formData.get('id'),
    status: formData.get('status'),
  });
  if (!parsed.success) return;
  const vote = await db.vote.update({
    where: { id: parsed.data.id },
    data: { commentStatus: parsed.data.status },
    select: { product: { select: { slug: true } } },
  });
  revalidatePath('/[locale]/admin/reviews', 'page');
  for (const l of locales) revalidatePath(`/${l}/product/${vote.product.slug}`);
}
