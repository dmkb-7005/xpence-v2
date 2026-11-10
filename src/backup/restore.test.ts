import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { XpenceDB } from '../db/schema';
import { ensureDefaults } from '../db/meta';
import { buildBackup } from './build';
import { sampleBackup } from './fixture';
import { parseBackup } from './schema';
import { restoreBackup } from './restore';

let database: XpenceDB;

beforeEach(() => {
  database = new XpenceDB(`test-${Math.random()}`);
});
afterEach(async () => {
  database.close();
  await database.delete();
});

describe('restore and build', () => {
  it('round-trips a backup through the database', async () => {
    await restoreBackup(database, sampleBackup);
    const rebuilt = await buildBackup(database, new Date('2026-11-10T00:00:00.000Z'));
    expect(rebuilt).toEqual(sampleBackup);
  });

  it('round-trips through JSON text and validation', async () => {
    await restoreBackup(database, sampleBackup);
    const text = JSON.stringify(await buildBackup(database, new Date(sampleBackup.exportedAt)));
    const parsed = parseBackup(JSON.parse(text));
    expect(parsed.ok && parsed.backup).toEqual(sampleBackup);
  });

  it('replaces existing data and keeps lastBackupAt', async () => {
    await ensureDefaults(database);
    await database.meta.put({ key: 'lastBackupAt', value: '2026-11-01T10:00:00.000Z' });
    await database.expenseTypes.add({ id: 'old', name: 'Old', hidden: false, createdAt: 'x' });

    await restoreBackup(database, sampleBackup);

    expect(await database.expenseTypes.get('old')).toBeUndefined();
    expect(await database.expenseTypes.count()).toBe(2);
    expect((await database.meta.get('lastBackupAt'))?.value).toBe('2026-11-01T10:00:00.000Z');
    expect((await database.meta.get('usualWindowMonths'))?.value).toBe(6);
  });

  it('leaves the database untouched when the restore fails midway', async () => {
    await restoreBackup(database, sampleBackup);
    const broken = { ...sampleBackup, expenses: [sampleBackup.expenses[0]!, sampleBackup.expenses[0]!] };
    await expect(restoreBackup(database, broken)).rejects.toThrow();
    expect(await database.expenses.count()).toBe(3);
  });

  it('exports defaults for settings that were never written', async () => {
    const backup = await buildBackup(database);
    expect(backup.settings).toEqual({ usualWindowMonths: 12, backupReminderDays: 14 });
  });
});
