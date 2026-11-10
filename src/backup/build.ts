import { DEFAULT_SETTINGS } from '../db/meta';
import type { XpenceDB } from '../db/schema';
import { SCHEMA_VERSION } from '../db/version';
import { backupSchema, type Backup } from './schema';

const byId = (a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id, undefined, { numeric: true });

/** Reads every table in one read-only transaction and returns a validated backup object. */
export async function buildBackup(database: XpenceDB, now: Date = new Date()): Promise<Backup> {
  return database.transaction('r', database.tables, async () => {
    const [expenseTypes, groups, colors, expenses, incomes, window, reminder] = await Promise.all([
      database.expenseTypes.toArray(),
      database.groups.toArray(),
      database.colors.toArray(),
      database.expenses.toArray(),
      database.incomes.toArray(),
      database.meta.get('usualWindowMonths'),
      database.meta.get('backupReminderDays'),
    ]);
    // sorted for stable, diff-friendly files
    return backupSchema.parse({
      app: 'xpence',
      schemaVersion: SCHEMA_VERSION,
      exportedAt: now.toISOString(),
      settings: {
        usualWindowMonths: window?.value ?? DEFAULT_SETTINGS.usualWindowMonths,
        backupReminderDays: reminder?.value ?? DEFAULT_SETTINGS.backupReminderDays,
      },
      expenseTypes: expenseTypes.sort(byId),
      groups: groups.sort(byId),
      colors: colors.sort((a, b) => a.sortOrder - b.sortOrder || byId(a, b)),
      expenses: expenses.sort((a, b) => a.date.localeCompare(b.date) || byId(a, b)),
      incomes: incomes.sort((a, b) => a.date.localeCompare(b.date) || byId(a, b)),
    });
  });
}
