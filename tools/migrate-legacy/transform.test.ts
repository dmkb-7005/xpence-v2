import { describe, expect, it } from 'vitest';
import { migrate, type LegacyInput } from './transform';

const NOW = new Date(2026, 10, 10);
const type = (Id: number, Name: string) => ({ ExpCat: { Id, Name, CreatedOn: '2020-09-21T20:49:43.187Z', UsageRate: 1 } });
const exp = (Id: number, Date: string, Amount: number, extra: Record<string, unknown> = {}) => ({
  Exp: { Id, Date, ExpCatId: 1, Amount, Remark: '', GroupId: 0, SubGroupId: 0, HighlightColorId: 0, CreatedOn: '2025-12-27T17:39:56Z', ...extra },
});
const inc = (Id: number, Date: string, Amount: number, extra: Record<string, unknown> = {}) => ({
  Inc: { Id, Date, Amount, Remark: 'Sueldo', CreatedOn: '1900-01-01T00:00:00', IsStockSale: false, IsDividend: false, ...extra },
});

function input(overrides: Partial<LegacyInput> = {}): LegacyInput {
  return {
    expenseTypes: [type(1, 'Alimentos'), type(7, 'Otros')],
    groups: [{ Group: { Id: 3, Name: 'Vacaciones', UsageRate: 1, CreatedOn: '2020-09-22T16:22:57.727Z' } }],
    colors: [
      { HighlightColor: { Id: 2, Hex: 'Fdff78', Name: 'Amarillo' } },
      { HighlightColor: { Id: 1, Hex: 'C25151', Name: 'Rojo oscuro' } },
    ],
    expenses: [exp(10, '2026-10-31', 42.22)],
    incomes: [inc(1, '2026-01-29', 5063.24)],
    ...overrides,
  };
}

describe('migrate', () => {
  it('maps ids to strings, normalises hex colors and orders them by legacy id', () => {
    const { backup } = migrate(input(), NOW);
    expect(backup.expenseTypes.map((t) => t.id)).toEqual(['1', '7']);
    expect(backup.colors).toEqual([
      { id: '1', name: 'Rojo oscuro', hex: '#C25151', sortOrder: 0, hidden: false },
      { id: '2', name: 'Amarillo', hex: '#FDFF78', sortOrder: 1, hidden: false },
    ]);
    expect(backup.settings).toEqual({ usualWindowMonths: 12, backupReminderDays: 14 });
  });

  it('converts to cents and reports values that had to be rounded', () => {
    const { backup, report } = migrate(input({ expenses: [exp(1, '2026-10-01', 2.675), exp(2, '2026-10-02', 10), exp(3, '2026-10-03', 3.14159)] }), NOW);
    expect(backup.expenses.map((e) => e.amountCents)).toEqual([268, 1000, 314]);
    expect(report.rounded.length).toBe(2);
  });

  it('turns 0 group and color ids into null and keeps real ones', () => {
    const { backup } = migrate(input({ expenses: [exp(1, '2026-10-01', 1), exp(2, '2026-10-02', 1, { GroupId: 3, HighlightColorId: 2 })] }), NOW);
    expect(backup.expenses[0]).toMatchObject({ groupId: null, colorId: null });
    expect(backup.expenses[1]).toMatchObject({ groupId: '3', colorId: '2' });
  });

  it('keeps negative and zero amounts and counts them', () => {
    const { backup, report } = migrate(input({ expenses: [exp(1, '2026-10-01', -5), exp(2, '2026-10-02', 0)], incomes: [inc(1, '2026-01-01', -10)] }), NOW);
    expect(backup.expenses.map((e) => e.amountCents)).toEqual([-500, 0]);
    expect([report.negativeExpenses, report.zeroExpenses, report.negativeIncomes]).toEqual([1, 1, 1]);
  });

  it('drops the 1900 placeholder and fixes the known 2006 date', () => {
    const { backup, report } = migrate(input({ expenses: [exp(2833, '1900-01-01', 0), exp(2281, '2006-08-06', 6.4)] }), NOW);
    expect(backup.expenses.map((e) => e.id)).toEqual(['2281']);
    expect(backup.expenses[0]?.date).toBe('2016-08-06');
    expect(report.dropped.length).toBe(1);
    expect(report.dateFixes.length).toBe(1);
    expect(report.counts.expenses).toEqual({ in: 2, out: 1 });
  });

  it('refuses a date fix whose old date does not match', () => {
    expect(() => migrate(input({ expenses: [exp(2281, '2007-01-01', 1)] }), NOW)).toThrow();
  });

  it('assigns expenses without a type to Otros, or fails if that type is missing', () => {
    const { backup, report } = migrate(input({ expenses: [exp(1, '2026-10-01', 5, { ExpCatId: 0 })] }), NOW);
    expect(backup.expenses[0]?.expenseTypeId).toBe('7');
    expect(report.defaultTypeAssigned.length).toBe(1);
    expect(() => migrate(input({ expenseTypes: [type(1, 'Alimentos')], expenses: [exp(1, '2026-10-01', 5, { ExpCatId: 0 })] }), NOW)).toThrow();
  });

  it('normalises line breaks and trims remarks', () => {
    const { backup, report } = migrate(input({ expenses: [exp(1, '2026-10-01', 5, { Remark: '  a\r\nb\rc  ' })] }), NOW);
    expect(backup.expenses[0]?.note).toBe('a\nb\nc');
    expect(report.multilineNotes).toBe(1);
  });

  it('replaces the 1900 createdOn of incomes and keeps the flags', () => {
    const { backup } = migrate(input({ incomes: [inc(1, '2026-02-10', 12.34, { IsDividend: true })] }), NOW);
    expect(backup.incomes[0]).toMatchObject({
      createdAt: '2026-02-10T00:00:00.000Z', updatedAt: '2026-02-10T00:00:00.000Z', isDividend: true, isStockSale: false,
    });
  });

  it('counts future-dated expenses and warns about implausible dates', () => {
    const { report } = migrate(input({ expenses: [exp(1, '2026-12-14', 14.99), exp(2, '1999-05-05', 1)] }), NOW);
    expect(report.futureExpenses).toBe(1);
    expect(report.warnings.length).toBe(1);
  });

  it('fails when a row references something that does not exist', () => {
    expect(() => migrate(input({ expenses: [exp(1, '2026-10-01', 5, { ExpCatId: 99 })] }), NOW)).toThrow();
    expect(() => migrate(input({ expenses: [exp(1, '2026-10-01', 5, { GroupId: 98 })] }), NOW)).toThrow();
  });

  it('fails clearly when the file shape is unexpected', () => {
    expect(() => migrate(input({ expenses: [{ Foo: 1 }] }), NOW)).toThrow();
  });
});
