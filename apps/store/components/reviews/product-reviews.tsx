import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { StarRating } from '@/components/catalog/star-rating';
import { ReviewForm } from '@/components/reviews/review-form';
import { getCurrentUserId } from '@/lib/auth/session';
import { formatRating } from '@/lib/money';
import { canReview, getMyReview, type RatingSummary, type ReviewDTO } from '@/lib/reviews/reviews';

const formatDate = (date: Date, locale: string): string =>
  new Intl.DateTimeFormat(locale === 'uz' ? 'uz-Latn-UZ' : locale === 'en' ? 'en-GB' : 'ru-RU', {
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Tashkent',
  }).format(date);

// Labor's own buyers, apart from the imported figures in the record above:
// those are Fragrantica's votes, these are people who bought it here.
export async function ProductReviews({
  productId,
  slug,
  locale,
  summary,
  reviews,
}: {
  productId: number;
  slug: string;
  locale: string;
  summary: RatingSummary;
  reviews: ReviewDTO[];
}) {
  const t = await getTranslations('reviews');
  const userId = await getCurrentUserId();
  const [buyer, mine] = userId
    ? await Promise.all([canReview(userId, productId), getMyReview(userId, productId)])
    : [false, null];

  return (
    <section id="reviews" className="border-border scroll-mt-24 space-y-6 border-t pt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h2 className="text-2xl font-semibold tracking-[-0.01em]">{t('title')}</h2>
        {summary.count > 0 ? (
          <div className="flex items-center gap-3">
            <StarRating value={summary.average} label={t('rating')} />
            <span className="text-muted-foreground text-label font-mono tracking-[0.12em] uppercase">
              {t('summary', { average: formatRating(summary.average), count: summary.count })}
            </span>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">{t('none')}</p>
        )}
      </div>

      {reviews.length > 0 && (
        <ul className="divide-border border-border divide-y border-y">
          {reviews.map((r, i) => (
            <li key={i} className="space-y-2 py-5">
              <div className="flex flex-wrap items-center gap-3">
                <StarRating value={r.rating} label={t('rating')} size="sm" />
                <span className="text-sm font-medium">{r.author || t('buyer')}</span>
                <span className="text-muted-foreground text-xs">{formatDate(r.date, locale)}</span>
              </div>
              <p className="max-w-prose text-sm leading-relaxed whitespace-pre-line">{r.comment}</p>
            </li>
          ))}
        </ul>
      )}

      {buyer ? (
        <ReviewForm
          productId={productId}
          slug={slug}
          locale={locale}
          initial={
            mine
              ? {
                  rating: mine.rating,
                  comment: mine.comment,
                  pending: mine.commentStatus === 'pending',
                }
              : null
          }
        />
      ) : (
        <p className="text-muted-foreground text-sm">
          {t('onlyBuyers')}{' '}
          {!userId && (
            <Link
              href={`/${locale}/account/login`}
              className="text-foreground underline underline-offset-4"
            >
              {t('signIn')}
            </Link>
          )}
        </p>
      )}
    </section>
  );
}
