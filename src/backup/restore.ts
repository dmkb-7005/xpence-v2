import type { XpenceDB } from '../db/schema';
import { SCHEMA_VERSION } from '../db/version';
import type { Backup } from './schema';

/**
 * Replaces every data table with the backup's content in ONE transaction: it either fully
 * succeeds or leaves the database untouched. Settings are restored; `lastBackupAt` is device
 * state, not part of the file, and is kept.
 * The caller validates with `parseBackup` and offers a recovery download first.
 */
export async function restoreBackup(database: XpenceDB, backup: Backup): Promise<void> {
  await database.transaction('rw', database.tables, async () => {
    await database.expenseTypes.clear();
    await database.groups.clear();
    await database.colors.clear();
    await database.expenses.clear();
    await database.incomes.clear();

    await database.expenseTypes.bulkAdd(backup.expenseTypes);
    await database.groups.bulkAdd(backup.groups);
    await database.colors.bulkAdd(backup.colors);
    await database.expenses.bulkAdd(backup.expenses);
    await database.incomes.bulkAdd(backup.incomes);

    await database.meta.bulkPut([
      { key: 'schemaVersion', value: SCHEMA_VERSION },
      { key: 'usualWindowMonths', value: backup.settings.usualWindowMonths },
      { key: 'backupReminderDays', value: backup.settings.backupReminderDays },
    ]);
  });
}
