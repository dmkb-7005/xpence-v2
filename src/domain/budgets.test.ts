import { describe, expect, it } from 'vitest';
import { barGradient, budgetView, toneFor } from './budgets';

// usual values from the real data (Alimentos, Total), in cents
const alimentos = { months: [], median: 24584, lower: 20000, upper: 29908 };
const total = { months: [], median: 204254, lower: 174877, upper: 260485 };

describe('toneFor', () => {
  it('matches the Budgets canvas for October', () => {
    expect(toneFor(42921, alimentos, 'past')).toBe('wayAbove'); // €429,21
    expect(toneFor(149276, total, 'past')).toBe('usual'); // €1.492,76: under the lower bound, not "clearly" below
    expect(toneFor(-42404, { months: [], median: 47301, lower: 10000, upper: 103910 }, 'past')).toBe('below'); // Gastos extra
    expect(toneFor(24598, { months: [], median: 8139, lower: 3000, upper: 18553 }, 'past')).toBe('above'); // Otros
  });

  it('never marks a month in progress below usual, and future months have no data', () => {
    expect(toneFor(0, alimentos, 'current')).toBe('usual');
    expect(toneFor(40000, alimentos, 'current')).toBe('wayAbove');
    expect(toneFor(40000, alimentos, 'future')).toBe('none');
  });

  it('treats everything as usual without history', () => {
    expect(toneFor(99999, null, 'past')).toBe('usual');
  });

  it('builds the bar gradient', () => {
    expect(barGradient(['wayAbove', 'usual', 'none'])).toBe('linear-gradient(90deg, #FF8A90 0%, #FF8A90 12%, #3D9BFF 50%, #4A5468 88%, #4A5468 100%)');
  });
});

describe('budgetView', () => {
  const types = [{ id: '1', name: 'Alimentos' }, { id: '6', name: 'Alcohol' }, { id: '9', name: 'Ropa' }];
  const row = (date: string, amountCents: number, expenseTypeId = '1') => ({ date, amountCents, expenseTypeId });
  // Aug..Oct: 100, 200, 300 Alimentos; Alcohol only in Oct; Ropa never
  const items = [row('2026-08-05', 100), row('2026-09-05', 200), row('2026-10-05', 300), row('2026-10-06', 50, '6'), row('2026-11-02', 70), row('2026-12-14', 15)];

  it('shows previous, focal and next month with kinds', () => {
    const v = budgetView(items, types, '2026-11', '2026-11-10', 3);
    expect(v.months).toEqual(['2026-10', '2026-11', '2026-12']);
    expect(v.total.cells.map((c) => c.kind)).toEqual(['past', 'current', 'future']);
    expect(v.total.cells.map((c) => c.valueCents)).toEqual([350, 70, 15]);
  });

  it('sorts types by name and leaves out types without spending or usual', () => {
    const v = budgetView(items, types, '2026-11', '2026-11-10', 3);
    expect(v.rows.map((r) => r.name)).toEqual(['Alcohol', 'Alimentos']);
    expect(v.rows[1]?.usualCents).toBe(200);
  });

  it('computes total deltas against the usual and the usual by day', () => {
    const v = budgetView(items, types, '2026-11', '2026-11-10', 3);
    expect(v.hasHistory).toBe(true);
    expect(v.total.deltas[2]).toBeNull();
    expect(v.total.day).toBe(10);
  });

  it('has no history when the window is not complete', () => {
    const v = budgetView(items, types, '2026-11', '2026-11-10', 6);
    expect(v.hasHistory).toBe(false);
    expect(v.rows.every((r) => r.usualCents === null)).toBe(true);
  });
});
