import { describe, expect, it } from 'vitest';
import { monthDrivers } from './drivers';

const e = (date: string, euros: number, expenseTypeId: string) => ({ date, amountCents: euros * 100, expenseTypeId });
const today = '2026-11-10';

// window for November with size 3: August, September, October
const history = [
  e('2026-08-05', 100, 'food'), e('2026-09-05', 120, 'food'), e('2026-10-05', 110, 'food'),
  e('2026-08-03', 40, 'phone'), e('2026-09-03', 40, 'phone'), e('2026-10-03', 40, 'phone'),
  // late in the month: not part of "usual by day 10"
  e('2026-08-25', 500, 'food'), e('2026-09-25', 500, 'food'), e('2026-10-25', 500, 'food'),
];

describe('monthDrivers', () => {
  it('ranks types by how far they are above their usual by this day', () => {
    const items = [
      ...history,
      e('2026-11-04', 180, 'food'), // usual by day 10 is 110 → +70
      e('2026-11-03', 40, 'phone'), // exactly usual → not listed
      e('2026-11-08', 300, 'car'), // never seen before → usual 0, +300
    ];
    expect(monthDrivers(items, today, 3)).toEqual([
      { typeId: 'car', spentCents: 30000, usualCents: 0, overCents: 30000 },
      { typeId: 'food', spentCents: 18000, usualCents: 11000, overCents: 7000 },
    ]);
  });

  it('ignores rows scheduled later this month and older history', () => {
    const items = [...history, e('2026-11-09', 50, 'phone'), e('2026-11-20', 999, 'phone'), e('2025-01-05', 9999, 'phone')];
    expect(monthDrivers(items, today, 3).map((d) => [d.typeId, d.overCents])).toEqual([['phone', 1000]]);
  });

  it('counts window months without spend as zero', () => {
    const items = [...history, e('2026-08-02', 60, 'gift'), e('2026-11-02', 60, 'gift')];
    // gift by day 10: 60, 0, 0 → median 0
    expect(monthDrivers(items, today, 3)[0]).toEqual({ typeId: 'gift', spentCents: 6000, usualCents: 0, overCents: 6000 });
  });

  it('limits the list and needs a full window', () => {
    const items = [...history, e('2026-11-01', 10, 'a'), e('2026-11-01', 20, 'b'), e('2026-11-01', 30, 'c'), e('2026-11-01', 40, 'd')];
    expect(monthDrivers(items, today, 3).map((d) => d.typeId)).toEqual(['d', 'c', 'b']);
    expect(monthDrivers(items, today, 6)).toEqual([]);
  });
});
