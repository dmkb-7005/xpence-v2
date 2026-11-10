import { useState, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { buildBackup } from '../../backup/build';
import { downloadText } from '../../backup/files';
import { restoreBackup } from '../../backup/restore';
import { parseBackup, type Backup } from '../../backup/schema';
import { useSnackbar } from '../../components/Snackbar';
import { db } from '../../db/db';
import { todayIso } from '../../domain/dates';

/** Interim Setup: record counts and restore from a JSON backup. Editors for lookups and settings follow later. */
export function SetupPage() {
  const snackbar = useSnackbar();
  const counts = useLiveQuery(async () => ({
    'Expense types': await db.expenseTypes.count(),
    Groups: await db.groups.count(),
    Colors: await db.colors.count(),
    Expenses: await db.expenses.count(),
    Incomes: await db.incomes.count(),
  }), []);

  const [pending, setPending] = useState<{ name: string; backup: Backup } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const file = input.files?.[0];
    input.value = ''; // selecting the same file again must trigger a new change event
    setPending(null);
    setErrors([]);
    if (!file) return;
    try {
      const result = parseBackup(JSON.parse(await file.text()));
      if (result.ok) setPending({ name: file.name, backup: result.backup });
      else setErrors(result.errors);
    } catch {
      setErrors(['The file is not valid JSON.']);
    }
  }

  async function restore() {
    if (!pending || busy) return;
    const { backup, name } = pending;
    const existing = (await db.expenses.count()) + (await db.incomes.count());
    const ok = window.confirm(
      `Replace ALL data on this device with "${name}"?\n\n` +
        `${backup.expenses.length} expenses, ${backup.incomes.length} incomes, ` +
        `${backup.expenseTypes.length} types, ${backup.groups.length} groups, ${backup.colors.length} colors.`,
    );
    if (!ok) return;
    setBusy(true);
    try {
      if (existing > 0) {
        // recovery copy of what is about to be replaced
        const recovery = await buildBackup(db);
        downloadText(`xpence-backup-recovery-${todayIso()}.json`, JSON.stringify(recovery));
      }
      await restoreBackup(db, backup);
      setPending(null);
      snackbar.show({ message: `Restored ${backup.expenses.length} expenses and ${backup.incomes.length} incomes` });
    } catch (e) {
      setErrors([e instanceof Error ? e.message : String(e)]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page">
      <p><Link to="/">&larr; Home</Link></p>
      <h1>Setup</h1>

      <h2>Stored on this device</h2>
      <ul>
        {counts && Object.entries(counts).map(([label, n]) => <li key={label}>{label}: {n}</li>)}
      </ul>

      <h2>Restore from backup</h2>
      <p>Choose a Xpence JSON backup. It replaces everything on this device.</p>
      <input type="file" accept=".json,application/json" onChange={(e) => void onFile(e)} />
      {errors.length > 0 && (
        <ul style={{ color: 'var(--danger)' }}>
          {errors.map((message) => <li key={message}>{message}</li>)}
        </ul>
      )}
      {pending && (
        <>
          <p>
            "{pending.name}" is valid: {pending.backup.expenses.length} expenses, {pending.backup.incomes.length} incomes.
          </p>
          <button type="button" className="btn" disabled={busy} onClick={() => void restore()}>
            Replace data with this backup
          </button>
        </>
      )}
    </main>
  );
}
