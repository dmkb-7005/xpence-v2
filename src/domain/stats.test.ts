import { describe, expect, it } from 'vitest';
import { median, percentile } from './stats';

describe('stats', () => {
  it('computes the median of odd and even lists', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([7])).toBe(7);
  });

  it('interpolates percentiles (type 7)', () => {
    expect(percentile([1000, 2000, 3000, 4000], 25)).toBe(1750);
    expect(percentile([1000, 2000, 3000, 4000], 75)).toBe(3250);
    expect(percentile([5, 1, 3], 0)).toBe(1);
    expect(percentile([5, 1, 3], 100)).toBe(5);
  });

  it('rejects empty input', () => {
    expect(() => median([])).toThrow();
  });
});
