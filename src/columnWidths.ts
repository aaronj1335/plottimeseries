export function apportionColumnWidths(measured: number[]): number[] {
  const widths = measured.map(width => Math.floor(width));
  const total = measured.reduce((sum, width) => sum + width, 0);
  let leftover = Math.floor(total) - widths.reduce((sum, width) => sum + width, 0);

  const byRemainder = measured
    .map((width, index) => ({ index, remainder: width - Math.floor(width) }))
    .sort((a, b) => b.remainder - a.remainder);

  for (const { index } of byRemainder) {
    if (leftover <= 0) break;
    const width = widths[index];
    if (width === undefined) continue;
    widths[index] = width + 1;
    leftover--;
  }

  return widths;
}
