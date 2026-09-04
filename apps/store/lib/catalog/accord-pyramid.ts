export const groupAccordsIntoPyramid = <T>(accords: readonly T[]): T[][] => {
  const rows: T[][] = [];
  let index = 0;

  for (let width = 1; index < accords.length; width += 1) {
    rows.push(accords.slice(index, index + width));
    index += width;
  }

  return rows;
};

export const getPyramidRowWidth = (itemCount: number): string =>
  `${Math.min(itemCount * 34, 100)}%`;
