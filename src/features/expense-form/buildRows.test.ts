import { describe, expect, it } from 'vitest';
import { buildExpenseRows, type ExpenseDraft } from './buildRows';

const draft: ExpenseDraft = {
  date: '2026-01-31', amountCents: 1499, expenseTypeId: '7', groupId: null, colorId: '2', note: '  Netflix ', repeatMonths: 0,
};
const counter = () => {
  let n = 0;
  return () => `id-${++n}`;
};

describe('buildExpenseRows', () => {
  it('creates a single row without a series when there is no repeat', () => {
    const rows = buildExpenseRows(draft, counter(), '2026-11-10T10:00:00.000Z');
    expect(rows.length).toBe(1);
    expect(rows[0]?.seriesId).toBeNull();
    expect(rows[0]?.note).toBe('Netflix');
    expect(rows[0]?.createdAt).toBe('2026-11-10T10:00:00.000Z');
  });

  it('creates N further rows that share one seriesId and clamp short months', () => {
    const rows = buildExpenseRows({ ...draft, repeatMonths: 3 }, counter(), 'now');
    expect(rows.map((r) => r.date)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
    expect(new Set(rows.map((r) => r.seriesId)).size).toBe(1);
    expect(rows[0]?.seriesId).not.toBeNull();
    expect(new Set(rows.map((r) => r.id)).size).toBe(4);
    expect(rows.every((r) => r.amountCents === 1499 && r.colorId === '2' && r.expenseTypeId === '7')).toBe(true);
  });
});
