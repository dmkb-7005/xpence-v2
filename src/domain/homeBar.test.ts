import { describe, expect, it } from 'vitest';
import { formatEuroShort, rangeBar } from './homeBar';
import type { Pace } from './usual';

const pace = (spentToDate: number, projected: number): Pace => ({
  spentToDate, scheduled: 1499, projected, usualToDate: 129099, expectedRemaining: 75155,
  usual: { months: [], median: 204254, lower: 174877, upper: 260485 }, state: 'onTrack', betterThanUsual: true,
});

describe('rangeBar', () => {
  it('matches the design positions for the sample month', () => {
    const bar = rangeBar(pace(74499, 149654))!;
    expect(bar.scaleMax).toBe(300000);
    expect(bar.lower.toFixed(1)).toBe('58.3');
    expect(bar.median.toFixed(1)).toBe('68.1');
    expect(bar.upper.toFixed(1)).toBe('86.8');
    expect(bar.spent.toFixed(1)).toBe('24.8');
    expect(bar.projected.toFixed(1)).toBe('49.9');
    expect(bar.overflow).toBe(false);
  });

  it('clamps and flags a projection beyond the scale', () => {
    const bar = rangeBar(pace(270000, 341000))!;
    expect(bar.projected).toBe(100);
    expect(bar.overflow).toBe(true);
  });

  it('is null without a usual range', () => {
    expect(rangeBar({ ...pace(1, 1), usual: null, projected: null })).toBeNull();
  });

  it('formats short euro labels', () => {
    expect(formatEuroShort(174877)).toBe('1.749');
    expect(formatEuroShort(204254)).toBe('2.043');
  });
});
