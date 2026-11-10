import { describe, expect, it } from 'vitest';
import { addMonthsClamped, addMonthsToKey, formatChipDate, formatDmy, isValidIsoDate, monthKeyOf, todayIso } from './dates';
import { repeatDates } from './repeats';

describe('dates', () => {
  it('validates calendar dates', () => {
    expect(isValidIsoDate('2026-02-28')).toBe(true);
    expect(isValidIsoDate('2026-02-29')).toBe(false);
    expect(isValidIsoDate('2028-02-29')).toBe(true);
    expect(isValidIsoDate('2026-13-01')).toBe(false);
    expect(isValidIsoDate('26-01-01')).toBe(false);
  });

  it('moves month keys across year boundaries', () => {
    expect(addMonthsToKey('2026-11', 2)).toBe('2027-01');
    expect(addMonthsToKey('2026-01', -1)).toBe('2025-12');
    expect(addMonthsToKey('2026-03', -12)).toBe('2025-03');
    expect(monthKeyOf('2026-11-09')).toBe('2026-11');
  });

  it('clamps the day to the end of shorter months', () => {
    expect(addMonthsClamped('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonthsClamped('2028-01-31', 1)).toBe('2028-02-29');
    expect(addMonthsClamped('2026-11-14', 2)).toBe('2027-01-14');
  });

  it('formats today from local date parts', () => {
    expect(todayIso(new Date(2026, 10, 9, 23, 59))).toBe('2026-11-09');
  });
});

describe('repeatDates', () => {
  it('computes every date from the original day, without drifting', () => {
    expect(repeatDates('2026-01-31', 4)).toEqual(['2026-02-28', '2026-03-31', '2026-04-30', '2026-05-31']);
  });

  it('crosses the year boundary', () => {
    expect(repeatDates('2026-11-14', 3)).toEqual(['2026-12-14', '2027-01-14', '2027-02-14']);
  });

  it('returns nothing for 0 and rejects invalid counts', () => {
    expect(repeatDates('2026-11-14', 0)).toEqual([]);
    expect(() => repeatDates('2026-11-14', -1)).toThrow();
    expect(() => repeatDates('2026-11-14', 1.5)).toThrow();
    expect(() => repeatDates('2026-11-14', 121)).toThrow();
  });
});

describe('chip dates', () => {
  it('formats with weekday', () => {
    expect(formatChipDate('2026-11-10')).toBe('Tue, 10-11-2026');
    expect(formatChipDate('2026-11-14')).toBe('Sat, 14-11-2026');
    expect(formatDmy('2027-02-14')).toBe('14-02-2027');
  });
});
