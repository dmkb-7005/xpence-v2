import { describe, expect, it } from 'vitest';
import {
  activeFilterCount, EMPTY_FILTER, groupByMonth, makeMatcher, monthHeader, normalizeText, presetRange,
} from './expenseFilter';

const today = '2026-11-10';
const row = (date: string, amountCents: number, extra: Partial<{ expenseTypeId: string; groupId: string | null; colorId: string | null; note: string }> = {}) => ({
  date, amountCents, expenseTypeId: '1', groupId: null, colorId: null, note: '', ...extra,
});

describe('presetRange', () => {
  it('uses whole calendar months', () => {
    expect(presetRange('this-month', today)).toEqual({ from: '2026-11-01', to: '2026-11-30' });
    expect(presetRange('last-month', today)).toEqual({ from: '2026-10-01', to: '2026-10-31' });
    expect(presetRange('last-month', '2026-01-15')).toEqual({ from: '2025-12-01', to: '2025-12-31' });
    expect(presetRange('this-year', today)).toEqual({ from: '2026-01-01', to: '2026-12-31' });
    expect(presetRange('last-12-months', today)).toEqual({ from: '2025-12-01', to: '2026-11-30' });
  });
});

describe('makeMatcher', () => {
  it('matches everything without filters', () => {
    expect(makeMatcher(EMPTY_FILTER, today)(row('2016-01-01', 1))).toBe(true);
  });

  it('combines date, type, group, colour and search', () => {
    const m = makeMatcher(
      { ...EMPTY_FILTER, preset: 'last-month', typeIds: ['1'], groupIds: ['3'], colorIds: ['2'], query: 'PANADERIA' },
      today,
    );
    expect(m(row('2026-10-10', 1, { groupId: '3', colorId: '2', note: 'Panadería Paco' }))).toBe(true);
    expect(m(row('2026-11-10', 1, { groupId: '3', colorId: '2', note: 'Panadería' }))).toBe(false);
    expect(m(row('2026-10-10', 1, { groupId: null, colorId: '2', note: 'Panadería' }))).toBe(false);
    expect(m(row('2026-10-10', 1, { groupId: '3', colorId: null, note: 'Panadería' }))).toBe(false);
    expect(m(row('2026-10-10', 1, { expenseTypeId: '2', groupId: '3', colorId: '2', note: 'Panadería' }))).toBe(false);
    expect(m(row('2026-10-10', 1, { groupId: '3', colorId: '2', note: 'Lidl' }))).toBe(false);
  });

  it('uses a custom range when there is no preset', () => {
    const m = makeMatcher({ ...EMPTY_FILTER, range: { from: '2026-10-01', to: '2026-10-15' } }, today);
    expect(m(row('2026-10-15', 1))).toBe(true);
    expect(m(row('2026-10-16', 1))).toBe(false);
  });

  it('counts active filters without the search', () => {
    expect(activeFilterCount({ ...EMPTY_FILTER, query: 'x' })).toBe(0);
    expect(activeFilterCount({ ...EMPTY_FILTER, preset: 'this-year', typeIds: ['1', '2'] })).toBe(2);
  });

  it('normalises accents and case', () => {
    expect(normalizeText(' Móvil ')).toBe('movil');
  });
});

describe('groupByMonth', () => {
  it('groups newest-first rows and totals each month', () => {
    const groups = groupByMonth([row('2026-12-14', 1499), row('2026-11-14', 1499), row('2026-11-05', 73000), row('2026-10-31', 4222)], today);
    expect(groups.map((g) => [g.month, g.totalCents, g.allScheduled, g.rows.length])).toEqual([
      ['2026-12', 1499, true, 1],
      ['2026-11', 74499, false, 2],
      ['2026-10', 4222, false, 1],
    ]);
  });

  it('formats month headers', () => {
    expect(monthHeader('2026-10')).toBe('OCTOBER 2026');
  });
});
