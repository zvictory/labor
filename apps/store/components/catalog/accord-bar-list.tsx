import React from 'react';
import { TickScale, toTicks } from './tick-scale';

export interface AccordItem {
  name: string;
  color_hex: string;
  weight: number;
}

// Accords, read the way the shop reads them: a measure on a scale, not a colour.
//
// This used to render each accord as a bar filled with `color_hex`, so a product
// page showed six saturated colours at once — the single largest 70/20/10
// violation on the site, and one that can never match the printed label, because
// no two media reproduce a colour the same way. `color_hex` stays in the
// database (the ETL keeps loading it); it is simply never drawn.

// The imported data carries eight to ten accords per fragrance. A shelf label
// carries the ones you can actually smell; ten measures side by side is a
// spreadsheet, not a description. Five, strongest first.
const SHOWN = 5;

export function AccordBarList({ accords }: { accords: AccordItem[] }) {
  if (!accords || accords.length === 0) return null;

  const shown = [...accords].sort((a, b) => b.weight - a.weight).slice(0, SHOWN);

  return (
    <div className="flex flex-col gap-4">
      <div className="border-hairline dark:border-gunmetal flex items-baseline justify-between border-b pb-3">
        <h3 className="text-lg font-semibold tracking-tight">Main accords</h3>
        <span className="text-muted-foreground text-micro font-mono tracking-[0.16em] uppercase">
          Olfactive signature
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {shown.map((accord) => (
          <div key={accord.name} className="flex items-center gap-4">
            <span className="text-muted-foreground text-label w-32 shrink-0 font-mono tracking-[0.12em] uppercase">
              {accord.name}
            </span>
            <TickScale value={toTicks(accord.weight, 100)} label={accord.name} />
            <span className="text-muted-foreground text-label ml-auto font-mono">
              {accord.weight}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
