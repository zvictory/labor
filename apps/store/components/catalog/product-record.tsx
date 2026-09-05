import { OlfactivePyramidView, type OlfactivePyramidProps } from './olfactive-pyramid-view';
import { PerfumerCard, type PerfumerInfo } from './perfumer-card';
import { TickScale, toTicks } from './tick-scale';
import { StarRating } from './star-rating';

// Layer two of the product page.
//
// The layer above it is the tester label: object, code, name, price, five
// accords, and the two things you can act on. Everything a customer only wants
// once they are already interested — the pyramid, the nose, the imported
// measurements — lives here, folded away behind one line, the way the archive
// drawers sit under the island rather than on it.
//
// Native <details>: no client island, works with JavaScript off, and the
// browser's own find-in-page opens it.

type Measurement = { label: string; value: number; scaleMax: number; display: string };

export function ProductRecord({
  notes,
  perfumers,
  locale,
  avgRating,
  avgLongevity,
  avgSillage,
  votesCount,
}: {
  notes: OlfactivePyramidProps['notes'];
  perfumers: PerfumerInfo[];
  locale: string;
  avgRating: number;
  avgLongevity: number;
  avgSillage: number;
  votesCount: number;
}) {
  const hasNotes = Boolean(notes.top?.length || notes.middle?.length || notes.base?.length);

  // Longevity and sillage arrive on a 0-10 scale and are redrawn on five ticks,
  // so the two read as one instrument. The rating is not in this table: it is a
  // verdict, not a quantity, and it gets stars — the same ones the label above
  // shows, so the page does not state the number two different ways.
  const measurements: Measurement[] = [
    { label: 'Longevity', value: avgLongevity, scaleMax: 10, display: avgLongevity.toFixed(1) },
    { label: 'Sillage', value: avgSillage, scaleMax: 10, display: avgSillage.toFixed(1) },
  ].filter((m) => m.value > 0);

  const primaryPerfumer = perfumers[0];

  // The rating lives outside `measurements` now, so both guards have to count
  // it — otherwise a product with a rating and nothing else renders nothing.
  const hasMeasures = measurements.length > 0 || avgRating > 0;

  if (!hasNotes && !hasMeasures && !primaryPerfumer) return null;

  return (
    <details className="group border-border border-t">
      <summary className="flex cursor-pointer list-none items-center justify-between py-5 [&::-webkit-details-marker]:hidden">
        <span className="text-label font-mono tracking-[0.2em] uppercase">Full record</span>
        <span className="text-muted-foreground text-label font-mono tracking-[0.2em] uppercase">
          <span className="group-open:hidden">Open +</span>
          <span className="hidden group-open:inline">Close −</span>
        </span>
      </summary>

      <div className="grid gap-12 pb-14 lg:grid-cols-[1fr_18rem] lg:gap-16">
        <div className="flex flex-col gap-8">
          {hasNotes && (
            <section className="flex flex-col gap-5">
              <h2 className="border-border border-b pb-3 text-lg font-semibold tracking-[-0.01em]">
                Olfactive pyramid
              </h2>
              <OlfactivePyramidView notes={notes} locale={locale} />
            </section>
          )}
        </div>

        <div className="flex flex-col gap-8">
          {hasMeasures && (
            <section className="flex flex-col gap-4">
              <div className="border-border flex items-baseline justify-between border-b pb-3">
                <h2 className="text-lg font-semibold tracking-[-0.01em]">Measurements</h2>
                <span className="text-muted-foreground text-micro font-mono tracking-[0.16em] uppercase">
                  {votesCount} votes
                </span>
              </div>
              {avgRating > 0 && (
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground text-label w-24 shrink-0 font-mono tracking-[0.12em] uppercase">
                    Rating
                  </span>
                  <StarRating value={avgRating} size="sm" />
                  <span className="text-muted-foreground text-label ml-auto font-mono tabular-nums">
                    {avgRating.toFixed(1)}
                  </span>
                </div>
              )}
              {measurements.map((m) => (
                <div key={m.label} className="flex items-center gap-4">
                  <span className="text-muted-foreground text-label w-24 shrink-0 font-mono tracking-[0.12em] uppercase">
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
                Imported reference data — not Labor reviews
              </p>
            </section>
          )}

          {primaryPerfumer && <PerfumerCard perfumer={primaryPerfumer} locale={locale} />}
        </div>
      </div>
    </details>
  );
}
