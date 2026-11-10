import { describe, expect, it } from 'vitest';
import { savingsPercent, summarizeMonths, summarizeYears } from './savings';

const incomes = [
  { date: '2026-02-27', amountCents: 445082 },
  { date: '2026-01-29', amountCents: 506324 },
  { date: '2025-12-30', amountCents: 394502 },
];
const expenses = [
  { date: '2026-02-03', amountCents: 134462 },
  { date: '2026-01-10', amountCents: 110773 },
  { date: '2025-12-12', amountCents: 197235 },
  { date: '2025-12-13', amountCents: 0 },
];

describe('savings', () => {
  it('computes savings and the percentage of income', () => {
    expect(savingsPercent(310620, 445082)).toBe(69.8);
    expect(savingsPercent(197267, 394502)).toBe(50);
    expect(savingsPercent(-100, 0)).toBeNull();
    expect(savingsPercent(-50000, 100000)).toBe(-50);
  });

  it('summarises months newest first', () => {
    const months = summarizeMonths(incomes, expenses);
    expect(months.map((m) => m.month)).toEqual(['2026-02', '2026-01', '2025-12']);
    expect(months[0]).toEqual({
      month: '2026-02', incomeCents: 445082, expensesCents: 134462, savingsCents: 310620, savingsPercent: 69.8,
    });
  });

  it('includes months that only have expenses', () => {
    const months = summarizeMonths([], [{ date: '2026-03-01', amountCents: 500 }]);
    expect(months[0]?.savingsCents).toBe(-500);
    expect(months[0]?.savingsPercent).toBeNull();
  });

  it('sums years from their months', () => {
    const [y2026, y2025] = summarizeYears(incomes, expenses);
    expect(y2026?.year).toBe(2026);
    expect(y2026?.incomeCents).toBe(951406);
    expect(y2026?.expensesCents).toBe(245235);
    expect(y2026?.savingsCents).toBe(706171);
    expect(y2026?.months.length).toBe(2);
    expect(y2025?.year).toBe(2025);
  });
});
