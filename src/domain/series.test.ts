import { describe, expect, it } from 'vitest';
import { applySeriesChanges, laterInSeries } from './series';

const row = (id: string, date: string, seriesId: string | null) => ({
  id, date, seriesId, amountCents: 1299, expenseTypeId: '1', groupId: null as string | null, colorId: null as string | null,
  note: 'Netflix', updatedAt: '2026-01-01T00:00:00.000Z',
});

const rows = [
  row('d', '2026-04-15', 's'),
  row('a', '2026-01-15', 's'),
  row('c', '2026-03-15', 's'),
  row('b', '2026-02-15', 's'),
  row('x', '2026-03-15', 'other'),
  row('y', '2026-03-15', null),
];

describe('laterInSeries', () => {
  it('returns the later rows of the same series, oldest first', () => {
    expect(laterInSeries(rows, rows[3]!).map((r) => r.id)).toEqual(['c', 'd']);
  });
  it('is empty for the last row and for rows outside a series', () => {
    expect(laterInSeries(rows, rows[0]!)).toEqual([]);
    expect(laterInSeries(rows, rows[5]!)).toEqual([]);
  });
  it('compares with the date being edited, not a changed one', () => {
    // the caller passes the stored row, so moving its date does not change which rows follow
    expect(laterInSeries(rows, { id: 'a', date: '2026-01-15', seriesId: 's' }).map((r) => r.id)).toEqual(['b', 'c', 'd']);
  });
});

describe('applySeriesChanges', () => {
  it('changes amount, type, group, colour and note but keeps ids and dates', () => {
    const later = laterInSeries(rows, rows[3]!);
    const changed = applySeriesChanges(later, {
      amountCents: 1599, expenseTypeId: '2', groupId: 'g', colorId: null, note: 'Netflix Premium',
    }, '2026-11-11T10:00:00.000Z');
    expect(changed.map((r) => [r.id, r.date, r.amountCents, r.expenseTypeId, r.groupId, r.note])).toEqual([
      ['c', '2026-03-15', 1599, '2', 'g', 'Netflix Premium'],
      ['d', '2026-04-15', 1599, '2', 'g', 'Netflix Premium'],
    ]);
    expect(changed[0]!.updatedAt).toBe('2026-11-11T10:00:00.000Z');
    expect(changed[0]!.seriesId).toBe('s');
  });
});
