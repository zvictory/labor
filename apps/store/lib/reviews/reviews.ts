// Reviews from Labor's own buyers, kept on the Vote row (one per user and
// product). Only someone with a delivered order that contained the product can
// rate it; the stars count at once, the text waits for staff (/admin/reviews).
//
// These are kept apart from the imported Fragrantica figures on purpose: they
// are the only ratings the product's structured data may carry (lib/seo.ts).

import { z } from 'zod';

import { db } from '@/lib/db';

export const RATING_MIN = 1;
export const RATING_MAX = 5;

export type CommentStatus = 'none' | 'pending' | 'published' | 'hidden';

export interface RatingSummary {
  average: number;
  count: number;
}

export interface ReviewDTO {
  author: string;
  rating: number;
  comment: string;
  date: Date;
}

/** Average to one decimal over in-range ratings; legacy rows outside 1–5 are left out. */
export const summarizeRatings = (ratings: readonly (number | null)[]): RatingSummary => {
  const valid = ratings.filter(
    (r): r is number => r !== null && Number.isInteger(r) && r >= RATING_MIN && r <= RATING_MAX,
  );
  if (valid.length === 0) return { average: 0, count: 0 };
  const sum = valid.reduce((a, b) => a + b, 0);
  return { average: Math.round((sum / valid.length) * 10) / 10, count: valid.length };
};

/**
 * What a review is signed with: the first word of the account's name, or null
 * (the page then says "a buyer"). Synthesised Telegram emails never show.
 */
export const reviewerName = (name: string | null): string | null => {
  const first = name?.trim().split(/\s+/)[0];
  return first ? first.slice(0, 40) : null;
};

export const reviewInputSchema = z.object({
  rating: z.coerce.number().int().min(RATING_MIN).max(RATING_MAX),
  comment: z
    .string()
    .trim()
    .max(1500)
    .transform((v) => (v ? v : null)),
});

/** Whether the user received this product in a delivered order. */
export const canReview = async (userId: number, productId: number): Promise<boolean> => {
  const order = await db.order.findFirst({
    where: { userId, status: 'delivered', items: { some: { productId } } },
    select: { id: true },
  });
  return order !== null;
};

/** The product's own-buyer rating and its published review texts, newest first. */
export const getProductReviews = async (
  productId: number,
  take = 20,
): Promise<{ summary: RatingSummary; reviews: ReviewDTO[] }> => {
  const [ratings, published] = await Promise.all([
    db.vote.findMany({
      where: { productId, rating: { gte: RATING_MIN, lte: RATING_MAX } },
      select: { rating: true },
    }),
    db.vote.findMany({
      where: { productId, commentStatus: 'published', comment: { not: null } },
      orderBy: { updatedAt: 'desc' },
      take,
      select: { rating: true, comment: true, updatedAt: true, user: { select: { name: true } } },
    }),
  ]);
  return {
    summary: summarizeRatings(ratings.map((r) => r.rating)),
    reviews: published.map((v) => ({
      author: reviewerName(v.user.name) ?? '',
      rating: v.rating ?? 0,
      comment: v.comment ?? '',
      date: v.updatedAt,
    })),
  };
};

export const getMyReview = (userId: number, productId: number) =>
  db.vote.findUnique({
    where: { userId_productId: { userId, productId } },
    select: { rating: true, comment: true, commentStatus: true },
  });

/**
 * Save the user's rating and text. Editing the text sends it back to review;
 * leaving it unchanged keeps whatever staff decided.
 */
export const saveReview = async (
  userId: number,
  productId: number,
  input: z.infer<typeof reviewInputSchema>,
): Promise<'saved' | 'not_a_buyer'> => {
  if (!(await canReview(userId, productId))) return 'not_a_buyer';

  const existing = await getMyReview(userId, productId);
  const textChanged = (existing?.comment ?? null) !== input.comment;
  const commentStatus: CommentStatus = !input.comment
    ? 'none'
    : textChanged
      ? 'pending'
      : ((existing?.commentStatus as CommentStatus | undefined) ?? 'pending');

  await db.vote.upsert({
    where: { userId_productId: { userId, productId } },
    create: { userId, productId, rating: input.rating, comment: input.comment, commentStatus },
    update: { rating: input.rating, comment: input.comment, commentStatus },
  });
  return 'saved';
};
