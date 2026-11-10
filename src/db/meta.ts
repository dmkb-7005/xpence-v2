import type { XpenceDB } from './schema';
import { SCHEMA_VERSION } from './schema';

export const DEFAULT_SETTINGS = {
  /** months of history for the "usual" range: 3, 6 or 12 */
  usualWindowMonths: 12,
  /** days after which the backup reminder shows */
  backupReminderDays: 14,
} as const;

/** Writes schemaVersion and fills in settings that do not exist yet. Never overwrites a setting. */
export async function ensureDefaults(database: XpenceDB): Promise<void> {
  await database.transaction('rw', database.meta, async () => {
    await database.meta.put({ key: 'schemaVersion', value: SCHEMA_VERSION });
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      if (!(await database.meta.get(key))) {
        await database.meta.put({ key, value });
      }
    }
  });
}
