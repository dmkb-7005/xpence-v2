import { describe, expect, it } from 'vitest';
import { backupStatus, daysAgo, formatBytes, formatDateTime, normalizeHex, sameName } from './setup';

const now = new Date('2026-11-11T14:00:00');

describe('backupStatus', () => {
  it('is never without a date', () => {
    expect(backupStatus(null, 14, now)).toEqual({ state: 'never', days: 0 });
  });
  it('is ok before and overdue from the reminder day', () => {
    expect(backupStatus(new Date('2026-11-08T19:06:00').toISOString(), 14, now)).toEqual({ state: 'ok', days: 2 });
    expect(backupStatus(new Date('2026-10-24T10:00:00').toISOString(), 14, now)).toEqual({ state: 'overdue', days: 18 });
    expect(backupStatus(new Date('2026-10-28T13:00:00').toISOString(), 14, now).state).toBe('overdue');
  });
  it('words the age', () => {
    expect(daysAgo(0)).toBe('today');
    expect(daysAgo(1)).toBe('yesterday');
    expect(daysAgo(3)).toBe('3 days ago');
  });
});

describe('formatting', () => {
  it('formats date and time in local time', () => {
    expect(formatDateTime(new Date('2026-11-08T19:06:00').toISOString())).toBe('Sun, 08-11-2026 · 19:06');
  });
  it('formats sizes', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(870_000)).toBe('850 KB');
    expect(formatBytes(4_400_000)).toBe('4,2 MB');
  });
  it('normalises hex colours', () => {
    expect(normalizeHex('e6c860')).toBe('#E6C860');
    expect(normalizeHex(' #4fbf92 ')).toBe('#4FBF92');
    expect(normalizeHex('#4fbf9')).toBeNull();
    expect(normalizeHex('red')).toBeNull();
  });
  it('compares names loosely', () => {
    expect(sameName(' Electricidad', 'electricidad')).toBe(true);
    expect(sameName('Internet/Movil', 'Internet/Móvil')).toBe(true);
    expect(sameName('Ropa', 'Rope')).toBe(false);
  });
});
