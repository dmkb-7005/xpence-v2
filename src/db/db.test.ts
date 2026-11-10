import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { XpenceDB } from './schema';
import { ensureDefaults } from './meta';

let database: XpenceDB;

beforeEach(() => {
  database = new XpenceDB(`test-${Math.random()}`);
});
afterEach(async () => {
  database.close();
  await database.delete();
});

describe('database', () => {
  it('writes defaults without overwriting existing settings', async () => {
    await database.meta.put({ key: 'usualWindowMonths', value: 6 });
    await ensureDefaults(database);
    expect((await database.meta.get('usualWindowMonths'))?.value).toBe(6);
    expect((await database.meta.get('backupReminderDays'))?.value).toBe(14);
    expect((await database.meta.get('schemaVersion'))?.value).toBe(1);
  });

  it('stores and queries expenses by date', async () => {
    await database.expenses.bulkAdd(
      ['2026-10-31', '2026-11-05', '2026-11-09'].map((date, i) => ({
        id: String(i),
        date,
        amountCents: 100 * (i + 1),
        expenseTypeId: '1',
        groupId: null,
        colorId: null,
        note: '',
        seriesId: null,
        createdAt: date,
        updatedAt: date,
      })),
    );
    const november = await database.expenses.where('date').between('2026-11-01', '2026-11-30', true, true).toArray();
    expect(november.map((e) => e.id)).toEqual(['1', '2']);
  });
});
