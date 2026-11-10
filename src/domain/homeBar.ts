import type { Pace } from './usual';

export interface RangeBar {
  /** euros-in-cents value at the right end of the bar */
  scaleMax: number;
  /** all positions in percent of the bar width, 0–100 */
  lower: number;
  median: number;
  upper: number;
  spent: number;
  projected: number;
  /** projection beyond the right end: draw an arrow */
  overflow: boolean;
  /** median label too close to a bound label to show without overlap */
  hideMedianLabel: boolean;
}

const STEP = 50_000; // €500

/** Geometry for the Home range bar. The scale ends 15% above the upper bound, rounded up to €500. */
export function rangeBar(pace: Pace): RangeBar | null {
  if (!pace.usual || pace.projected === null) return null;
  const scaleMax = Math.max(STEP, Math.ceil((pace.usual.upper * 1.15) / STEP) * STEP);
  const pct = (v: number) => Math.min(100, Math.max(0, (v / scaleMax) * 100));
  const lower = pct(pace.usual.lower);
  const median = pct(pace.usual.median);
  const upper = pct(pace.usual.upper);
  return {
    scaleMax,
    lower,
    median,
    upper,
    spent: pct(pace.spentToDate),
    projected: pct(pace.projected),
    overflow: pace.projected > scaleMax,
    hideMedianLabel: median - lower < 12 || upper - median < 12,
  };
}

/** `1.749` (whole euros, thousands dot) for the bar labels. */
export function formatEuroShort(cents: number): string {
  return String(Math.round(cents / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
