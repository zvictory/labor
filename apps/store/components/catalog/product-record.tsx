import { useTranslations } from 'next-intl';

import { PerfumerCard, type PerfumerInfo } from './perfumer-card';
import { TickScale, toTicks } from './tick-scale';
import { StarRating } from './star-rating';

// Layer two of the product page.
//
// The layer above it is the tester label: object, code, name, price, the notes,
// and the two things you can act on. Everything a customer only wants once they
// are already interested — the nose, the imported measurements — lives here,
// folded away behind one line, the way the archive drawers sit under the island
// rather than on it.
//
// Native <details>: no client island, works with JavaScript off, and the
// browser's own find-in-page opens it.

type Measurement = { label: string; value: number; scaleMax: number; display: string };

export function ProductRecord({
  perfumers,
  locale,
  avgRating,
  avgLongevity,
  avgSillage,
  votesCount,
}: {
  perfumers: PerfumerInfo[];
  locale: string;
  avgRating: number;
  avgLongevity: number;
  avgSillage: number;
  votesCount: number;
}) {
  const t = useTranslations('pdp');

  // Longevity and sillage arrive on a 0-10 scale and are redrawn on five ticks,
  // so the two read as one instrument. The rating is not in this table: it is a
  // verdict, not a quantity, and it gets stars — the same ones the label above
  // shows, so the page does not state the number two different ways.
  const measurements: Measurement[] = [
    {
      label: t('vote.longevity'),
      value: avgLongevity,
      scaleMax: 10,
      display: avgLongevity.toFixed(1),
    },
    { label: t('vote.sillage'), value: avgSillage, scaleMax: 10, display: avgSillage.toFixed(1) },
  ].filter((m) => m.value > 0);

  const primaryPerfumer = perfumers[0];

  // The rating lives outside `measurements` now, so both guards have to count
  // it — otherwise a product with a rating and nothing else renders nothing.
  const hasMeasures = measurements.length > 0 || avgRating > 0;

  if (!hasMeasures && !primaryPerfumer) return null;

  return (
    <details className="group border-border border-t">
      <summary className="flex cursor-pointer list-none items-center justify-between py-5 [&::-webkit-details-marker]:hidden">
        <span className="text-label font-mono tracking-[0.2em] uppercase">{t('record.title')}</span>
        <span className="text-muted-foreground text-label font-mono tracking-[0.2em] uppercase">
          <span className="group-open:hidden">{t('record.open')}</span>
          <span className="hidden group-open:inline">{t('record.close')}</span>
        </span>
      </summary>

      <div className="grid gap-12 pb-14 lg:grid-cols-2 lg:gap-16">
        {hasMeasures && (
          <section className="flex flex-col gap-4">
            <div className="border-border flex items-baseline justify-between border-b pb-3">
              <h2 className="text-lg font-semibold tracking-[-0.01em]">
                {t('record.measurements')}
              </h2>
              <span className="text-muted-foreground text-micro font-mono tracking-[0.16em] uppercase">
                {t('votes', { count: votesCount })}
              </span>
            </div>
            {avgRating > 0 && (
              <div className="flex items-center gap-4">
                <span className="text-muted-foreground text-label w-28 shrink-0 font-mono tracking-[0.12em] uppercase">
                  {t('rating')}
                </span>
                <StarRating value={avgRating} label={t('rating')} size="sm" />
                <span className="text-muted-foreground text-label ml-auto font-mono tabular-nums">
                  {avgRating.toFixed(1)}
                </span>
              </div>
            )}
            {measurements.map((m) => (
              <div key={m.label} className="flex items-center gap-4">
                <span className="text-muted-foreground text-label w-28 shrink-0 font-mono tracking-[0.12em] uppercase">
                  {m.label}
                </span>
                <TickScale value={toTicks(m.value, m.scaleMax)} label={m.label} />
                <span className="text-muted-foreground text-label ml-auto font-mono tabular-nums">
                  {m.display}
                </span>
              </div>
            ))}
            {/* These averages came in with the catalogue import; they are not
                  Labor's own reviews, and the page should not imply they are. */}
            <p className="text-muted-foreground text-micro font-mono leading-relaxed tracking-[0.08em] uppercase">
              {t('record.imported')}
            </p>
          </section>
        )}

        {primaryPerfumer && <PerfumerCard perfumer={primaryPerfumer} locale={locale} />}
      </div>
    </details>
  );
}
