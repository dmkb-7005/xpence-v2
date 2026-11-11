import { describe, expect, it } from 'vitest';
import { countLabel, EMPTY_INCOME_FILTER, flagsFor, isIncomeFilterActive, kindOf, makeIncomeMatcher, overviewYears } from './incomeFilter';

const inc = (date: string, amountCents: number, kind: 'regular' | 'dividend' | 'stockSale' = 'regular', note = '') =>
  ({ date, amountCents, note, ...flagsFor(kind) });

describe('income kinds', () => {
  it('maps flags to a kind and back', () => {
    expect(kindOf({ isDividend: true, isStockSale: false })).toBe('dividend');
    expect(kindOf({ isDividend: false, isStockSale: true })).toBe('stockSale');
    expect(kindOf({ isDividend: false, isStockSale: false })).toBe('regular');
    expect(flagsFor('stockSale')).toEqual({ isDividend: false, isStockSale: true });
  });

  it('labels counts by kind', () => {
    expect(countLabel(12, 'dividend')).toBe('12 dividends');
    expect(countLabel(1, 'stockSale')).toBe('1 stock sale');
    expect(countLabel(5, 'all')).toBe('5 entries');
  });
});

describe('makeIncomeMatcher', () => {
  it('filters by kind, date and accent-free search', () => {
    const m = makeIncomeMatcher({ ...EMPTY_INCOME_FILTER, kind: 'dividend', preset: 'this-year', query: 'correccion' }, '2026-11-11');
    expect(m(inc('2026-03-03', -1471, 'dividend', 'Dividendos – corrección retención'))).toBe(true);
    expect(m(inc('2025-03-03', -1471, 'dividend', 'corrección'))).toBe(false);
    expect(m(inc('2026-03-03', -1471, 'regular', 'corrección'))).toBe(false);
    expect(isIncomeFilterActive(EMPTY_INCOME_FILTER)).toBe(false);
    expect(isIncomeFilterActive({ ...EMPTY_INCOME_FILTER, kind: 'dividend' })).toBe(true);
  });
});

describe('overviewYears', () => {
  it('leaves out months after the current one and marks the current year', () => {
    const years = overviewYears(
      [inc('2026-11-09', 740), inc('2026-10-29', 466737), inc('2025-12-30', 394502)],
      [{ date: '2026-12-14', amountCents: 1499 }, { date: '2026-11-14', amountCents: 1499 }, { date: '2026-10-05', amountCents: 149276 }],
      '2026-11-11',
    );
    expect(years.map((y) => [y.year, y.toDate, y.months.map((m) => m.month)])).toEqual([
      [2026, true, ['2026-11', '2026-10']],
      [2025, false, ['2025-12']],
    ]);
    expect(years[0]?.expensesCents).toBe(150775);
  });
});
