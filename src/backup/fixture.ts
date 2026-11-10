import type { Backup } from './schema';

/** Small valid backup used by the tests. */
export const sampleBackup: Backup = {
  app: 'xpence',
  schemaVersion: 1,
  exportedAt: '2026-11-10T00:00:00.000Z',
  settings: { usualWindowMonths: 6, backupReminderDays: 14 },
  expenseTypes: [
    { id: '1', name: 'Alimentos', hidden: false, createdAt: '2020-09-21T20:49:43.187Z' },
    { id: '7', name: 'Otros', hidden: true, createdAt: '2020-09-21T20:55:15.237Z' },
  ],
  groups: [{ id: '3', name: 'Vacaciones', hidden: false, createdAt: '2020-09-22T16:22:57.727Z' }],
  colors: [{ id: '2', name: 'Amarillo', hex: '#FDFF78', sortOrder: 0, hidden: false }],
  expenses: [
    {
      id: '10', date: '2026-10-31', amountCents: 4222, expenseTypeId: '1', groupId: null, colorId: null,
      note: '', seriesId: null, createdAt: '2026-11-02T20:20:00Z', updatedAt: '2026-11-02T20:20:00Z',
    },
    {
      id: '11', date: '2026-11-14', amountCents: 1499, expenseTypeId: '7', groupId: '3', colorId: '2',
      note: 'Netflix; "family" plan\nsecond line', seriesId: 'series-1',
      createdAt: '2026-08-24T19:51:00Z', updatedAt: '2026-08-24T19:51:00Z',
    },
    {
      id: '12', date: '2026-11-20', amountCents: -2500, expenseTypeId: '1', groupId: null, colorId: null,
      note: 'refund', seriesId: null, createdAt: '2026-11-20T10:00:00Z', updatedAt: '2026-11-20T10:00:00Z',
    },
  ],
  incomes: [
    {
      id: '1', date: '2026-01-29', amountCents: 506324, note: 'Sueldo', isDividend: false, isStockSale: false,
      createdAt: '2026-01-29T00:00:00.000Z', updatedAt: '2026-01-29T00:00:00.000Z',
    },
    {
      id: '2', date: '2026-02-10', amountCents: 1234, note: '', isDividend: true, isStockSale: false,
      createdAt: '2026-02-10T00:00:00.000Z', updatedAt: '2026-02-10T00:00:00.000Z',
    },
  ],
};
