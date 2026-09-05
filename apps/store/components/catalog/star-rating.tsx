// The five-star rating, drawn in the system's own two colours.
//
// A star is the one shape everyone already reads as "how good", and no amount
// of consistency argument makes a tick mark say that as fast. So ratings get
// stars; the tick scale keeps the measures that are quantities rather than
// verdicts — accord strength, longevity, sillage. How good vs. how much.
//
// Monochrome on purpose. The convention wants gold, and gold here would be
// amber, which measures 1.5:1 on off-white and can carry neither text nor
// meaning. Filled is the object colour, empty is the hairline — the same pair
// the tick scale uses, so the two graphics sit on a product page as one family.
//
// Halves are real: the averages run 3.6 to 4.9 and rounding 4.4 and 4.6 to the
// same four stars throws away the only thing that separates most of the
// catalogue. The partial star is a clipped overlay, not a second glyph.

const SIZES = {
  sm: { box: 'h-3 w-3', gap: 'gap-0.5' },
  md: { box: 'h-4 w-4', gap: 'gap-1' },
} as const;

export type StarRatingSize = keyof typeof SIZES;

const Star = ({ className }: { className: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
    <path
      d="M12 2.5l2.9 6.2 6.6.9-4.8 4.7 1.2 6.7L12 17.8 6.1 21l1.2-6.7L2.5 9.6l6.6-.9z"
      fill="currentColor"
    />
  </svg>
);

export const StarRating = ({
  value,
  max = 5,
  size = 'md',
  label = 'Rating',
  className = '',
}: {
  /** The rating itself, on a 0..max scale. Fractions are drawn. */
  value: number;
  max?: number;
  size?: StarRatingSize;
  /** Announced to screen readers. */
  label?: string;
  className?: string;
}) => {
  const safe = Number.isFinite(value) ? Math.max(0, Math.min(max, value)) : 0;
  const { box, gap } = SIZES[size];

  return (
    <div
      role="img"
      aria-label={`${label}: ${safe.toFixed(1)} of ${max}`}
      className={`flex items-center ${gap} ${className}`}
    >
      {Array.from({ length: max }, (_, i) => {
        // How much of *this* star is filled: 1 for a whole one, 0 for an empty
        // one, and the remainder for the single star the value lands inside.
        const fill = Math.max(0, Math.min(1, safe - i));
        return (
          <span key={i} aria-hidden="true" className={`relative block ${box}`}>
            <Star className={`text-hairline dark:text-gunmetal absolute inset-0 ${box}`} />
            {fill > 0 && (
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${fill * 100}%` }}
              >
                <Star className={`text-graphite dark:text-offwhite ${box}`} />
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
};
