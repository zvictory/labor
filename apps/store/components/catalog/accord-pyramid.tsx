import { getReadableTextColor } from '@/components/catalog/color-contrast';
import { getPyramidRowWidth, groupAccordsIntoPyramid } from '@/lib/catalog/accord-pyramid';
import type { ProductAccordDTO } from '@/lib/catalog/types';

export function AccordPyramid({ accords }: { accords: ProductAccordDTO[] }) {
  const rows = groupAccordsIntoPyramid(accords);

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-2">
      {rows.map((row, rowIndex) => (
        <div
          key={rowIndex}
          className="flex w-full justify-center gap-2"
          style={{ maxWidth: getPyramidRowWidth(row.length) }}
        >
          {row.map((accord) => (
            <span
              key={accord.name}
              className="text-micro min-w-0 flex-1 rounded-sm border border-black/5 px-3 py-2 text-center font-semibold tracking-wider uppercase shadow-sm"
              style={
                accord.color_hex
                  ? {
                      backgroundColor: accord.color_hex,
                      color: getReadableTextColor(accord.color_hex),
                    }
                  : undefined
              }
            >
              {accord.name}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
