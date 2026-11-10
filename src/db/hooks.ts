import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';

/** How many expenses reference each type or group id. Live, never stored, so it cannot drift. */
export function useUsageCounts(index: 'expenseTypeId' | 'groupId'): Map<string, number> | undefined {
  return useLiveQuery(async () => {
    const counts = new Map<string, number>();
    await db.expenses.orderBy(index).eachKey((key) => {
      if (typeof key === 'string') counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return counts;
  }, [index]);
}

export interface Settings {
  usualWindowMonths: number;
  backupReminderDays: number;
  lastBackupAt: string | null;
}

/** Settings and device state from the meta table, with defaults. */
export function useSettings(): Settings | undefined {
  return useLiveQuery(async () => {
    const [window, reminder, last] = await db.meta.bulkGet(['usualWindowMonths', 'backupReminderDays', 'lastBackupAt']);
    return {
      usualWindowMonths: typeof window?.value === 'number' ? window.value : 12,
      backupReminderDays: typeof reminder?.value === 'number' ? reminder.value : 14,
      lastBackupAt: typeof last?.value === 'string' ? last.value : null,
    };
  }, []);
}
