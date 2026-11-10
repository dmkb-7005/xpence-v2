/** Percentile with linear interpolation between closest ranks (type 7), `p` from 0 to 100. */
export function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) throw new RangeError('percentile of an empty list');
  const sorted = [...values].sort((a, b) => a - b);
  const h = ((sorted.length - 1) * p) / 100;
  const lo = Math.floor(h);
  const hi = Math.ceil(h);
  const a = sorted[lo] as number;
  const b = sorted[hi] as number;
  return a + (h - lo) * (b - a);
}

export function median(values: readonly number[]): number {
  return percentile(values, 50);
}
