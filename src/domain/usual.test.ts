import { describe, expect, it } from 'vitest';
import { assessMonth, computePace, computeUsual, firstMonthOf, totalsByMonth, windowFor, type Dated } from './usual';

const row = (date: string, amountCents: number): Dated => ({ date, amountCents });

// Jul..Oct 2026: totals 1000, 2000, 3000, 4000 (half on day 1, half on day 20)
const history: Dated[] = [
  row('2026-07-01', 500), row('2026-07-20', 500),
  row('2026-08-01', 1000), row('2026-08-20', 1000),
  row('2026-09-01', 1500), row('2026-09-20', 1500),
  row('2026-10-01', 2000), row('2026-10-20', 2000),
];

describe('usual range', () => {
  it('limits the window to months with data and to the window size', () => {
    expect(windowFor('2026-11', 12, '2026-07')).toEqual(['2026-07', '2026-08', '2026-09', '2026-10']);
    expect(windowFor('2026-11', 3, '2026-07')).toEqual(['2026-08', '2026-09', '2026-10']);
    expect(windowFor('2026-11', 3, null)).toEqual([]);
  });

  it('computes median and the 25th to 75th percentile band', () => {
    const usual = computeUsual(totalsByMonth(history), firstMonthOf(history), '2026-11', 4);
    expect(usual?.median).toBe(2500);
    expect(usual?.lower).toBe(1750);
    expect(usual?.upper).toBe(3250);
  });

  it('counts zero-spend months inside the span', () => {
    const totals = new Map([['2026-07', 3000]]);
    const usual = computeUsual(totals, '2026-07', '2026-11', 4);
    expect(usual?.months).toEqual(['2026-07', '2026-08', '2026-09', '2026-10']);
    expect(usual?.median).toBe(0);
    expect(usual?.upper).toBe(750);
  });

  it('hides the comparison until the whole window has history', () => {
    const totals = totalsByMonth(history);
    expect(computeUsual(totals, firstMonthOf(history), '2026-11', 12)).toBeNull(); // 4 of 12
    expect(computeUsual(totals, firstMonthOf(history), '2026-11', 6)).toBeNull(); // 4 of 6
    expect(computeUsual(totals, firstMonthOf(history), '2026-11', 3)?.months).toEqual(['2026-08', '2026-09', '2026-10']);
  });
});

describe('pace', () => {
  const today = '2026-11-10';

  it('is on track when the projection stays inside the range', () => {
    const pace = computePace([...history, row('2026-11-01', 1500), row('2026-11-14', 1499)], today, 4);
    expect(pace.spentToDate).toBe(1500);
    expect(pace.scheduled).toBe(1499);
    expect(pace.usualToDate).toBe(1250);
    expect(pace.expectedRemaining).toBe(1250);
    // scheduled (1499) is larger than the usual remainder (1250)
    expect(pace.projected).toBe(2999);
    expect(pace.state).toBe('onTrack');
    expect(pace.betterThanUsual).toBe(false);
  });

  it('is better than usual when the projection is below the median', () => {
    const pace = computePace([...history, row('2026-11-01', 500)], today, 4);
    expect(pace.projected).toBe(1750);
    expect(pace.state).toBe('onTrack');
    expect(pace.betterThanUsual).toBe(true);
  });

  it('trends over when the projection leaves the range but spend so far has not', () => {
    const pace = computePace([...history, row('2026-11-01', 2400)], today, 4);
    expect(pace.projected).toBe(3650);
    expect(pace.state).toBe('trendingOver');
  });

  it('is over when spend so far already exceeds the upper bound', () => {
    const pace = computePace([...history, row('2026-11-01', 3300)], today, 4);
    expect(pace.state).toBe('over');
  });

  it('does not count future rows as spent so far', () => {
    const pace = computePace([...history, row('2026-11-14', 1499)], today, 4);
    expect(pace.spentToDate).toBe(0);
    expect(pace.scheduled).toBe(1499);
  });

  it('keeps totals but hides the comparison without enough history', () => {
    const pace = computePace([row('2026-10-05', 100), row('2026-11-02', 700)], today, 4);
    expect(pace.spentToDate).toBe(700);
    expect(pace.usual).toBeNull();
    expect(pace.projected).toBeNull();
    expect(pace.state).toBeNull();
  });
});

describe('assessMonth', () => {
  it('flags a complete month above the usual range', () => {
    const items = [...history, row('2026-11-05', 3800)];
    // window for Nov: Jul..Oct (4 months), upper = 3250
    expect(assessMonth(items, '2026-11', 4).aboveUsual).toBe(true);
    expect(assessMonth(items, '2026-11', 4).total).toBe(3800);
  });

  it('does not flag a month inside the range', () => {
    expect(assessMonth([...history, row('2026-11-05', 3000)], '2026-11', 4).aboveUsual).toBe(false);
  });
});
