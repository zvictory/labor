import React from 'react';

// The rule the catalogue already reads by, extracted so the three index pages
// obey it too rather than each inventing its own wall.
//
// The shop holds at most 84 testers on the island, in seven blocks of twelve.
// A screen has no such limit, so a list of 411 notes arrives as one
// undifferentiated 24 000-pixel scroll unless something breaks it. The marker
// line is what does it: a hairline, a name on the left, a position on the
// right. It also answers the question a long list always raises — how far in
// am I, and how much is left.

export const pad = (n: number): string => String(n).padStart(3, '0');

export const chunk = <T,>(rows: readonly T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(rows.length / size) }, (_, i) =>
    rows.slice(i * size, (i + 1) * size),
  );

/** Hairline rule with a label on the left and a position on the right. */
export const BlockMarker = ({ label, position }: { label: string; position: string }) => (
  <div className="border-border text-muted-foreground text-micro flex items-baseline justify-between border-t pt-3 font-mono tracking-[0.16em] uppercase">
    <span>{label}</span>
    <span className="tabular-nums">{position}</span>
  </div>
);
