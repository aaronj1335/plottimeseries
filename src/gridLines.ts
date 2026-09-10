export function subdivideGridPositions(
  majors: number[],
  divisions: number,
  extent: [number, number],
): number[] {
  if (divisions < 2) return [];

  const sorted = [...majors].sort((a, b) => a - b);

  const first = sorted[0];
  const second = sorted[1];
  const secondLast = sorted[sorted.length - 2];
  const lastMajor = sorted[sorted.length - 1];
  if (
    first === undefined ||
    second === undefined ||
    secondLast === undefined ||
    lastMajor === undefined
  ) {
    return [];
  }

  const [lo, hi] = extent[0] <= extent[1] ? extent : [extent[1], extent[0]];
  const positions: number[] = [];

  sorted.forEach((from, i) => {
    const to = sorted[i + 1];
    if (to === undefined) return;
    const gap = to - from;
    if (gap <= 0) return;
    for (let step = 1; step < divisions; step++) {
      positions.push(from + (gap * step) / divisions);
    }
  });

  const leading = (second - first) / divisions;
  for (let p = first - leading; p >= lo && leading > 0; p -= leading) {
    positions.push(p);
  }

  const trailing = (lastMajor - secondLast) / divisions;
  for (let p = lastMajor + trailing; p <= hi && trailing > 0; p += trailing) {
    positions.push(p);
  }

  return positions.filter(p => p >= lo && p <= hi);
}
