// The laboratory scale from the shop's paper label (I1–I5), on screen.
//
// This is the single graphic that makes shelf and site read as one system: the
// 24 × 32 mm tester label carries it along its bottom edge, and every screen
// that shows intensity carries the identical drawing. Deliberately colourless —
// accord `colorHex` stays in the database and is never rendered, because two
// media never reproduce the same colour and a stack of rainbow bars is the
// single biggest 70/20/10 violation available.

const TICK_HEIGHT = { sm: 'h-2.5', md: 'h-3.5' } as const;

export type TickScaleSize = keyof typeof TICK_HEIGHT;

/** Map an open-ended measure onto the fixed five-tick scale. */
export const toTicks = (value: number, scaleMax: number, ticks = 5): number => {
  if (!Number.isFinite(value) || value <= 0 || scaleMax <= 0) return 0;
  return Math.max(1, Math.min(ticks, Math.round((value / scaleMax) * ticks)));
};

export const TickScale = ({
  value,
  max = 5,
  size = 'md',
  label,
  className = '',
}: {
  /** Number of filled ticks. Clamped into [0, max]. */
  value: number;
  max?: number;
  size?: TickScaleSize;
  /** Announced to screen readers, e.g. "Longevity". */
  label?: string;
  className?: string;
}) => {
  const filled = Math.max(0, Math.min(max, Math.round(value)));
  const height = TICK_HEIGHT[size];

  return (
    <div
      role="img"
      aria-label={label ? `${label}: ${filled} of ${max}` : `${filled} of ${max}`}
      className={`flex items-end gap-1 ${className}`}
    >
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={`w-[3px] ${height} ${i < filled ? 'bg-graphite dark:bg-offwhite' : 'bg-hairline dark:bg-gunmetal'}`}
        />
      ))}
    </div>
  );
};
