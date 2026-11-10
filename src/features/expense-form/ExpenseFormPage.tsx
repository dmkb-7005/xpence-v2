import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { AmountKeypad } from '../../components/AmountKeypad';
import { useSnackbar } from '../../components/Snackbar';
import { db } from '../../db/db';
import { useUsageCounts } from '../../db/hooks';
import type { Expense } from '../../db/schema';
import { isValidIsoDate, todayIso } from '../../domain/dates';
import { evaluateAmount } from '../../domain/keypad';
import { formatCsvAmount } from '../../domain/money';
import { MAX_REPEAT_MONTHS } from '../../domain/repeats';
import { sortByUsage } from '../../domain/usage';
import { buildExpenseRows } from './buildRows';
import styles from './ExpenseForm.module.css';

/** `/expenses/new` creates, `/expenses/:id` edits one row. */
export function ExpenseFormPage() {
  const { id } = useParams();
  if (id === undefined) return <ExpenseForm />;
  return <EditExpense id={id} />;
}

function EditExpense({ id }: { id: string }) {
  const expense = useLiveQuery(async () => (await db.expenses.get(id)) ?? null, [id]);
  if (expense === undefined) return <main className={styles.page}><p>Loading…</p></main>;
  if (expense === null) {
    return (
      <main className={styles.page}>
        <p>This expense no longer exists.</p>
        <Link to="/">&larr; Home</Link>
      </main>
    );
  }
  return <ExpenseForm key={expense.id} existing={expense} />;
}

/** Amount as editable text: `12`, `12,5`, `-5,25`. */
const plainAmount = (cents: number) => formatCsvAmount(cents).replace(/,00$/, '');

function ExpenseForm({ existing }: { existing?: Expense }) {
  const navigate = useNavigate();
  const location = useLocation();
  const snackbar = useSnackbar();

  const types = useLiveQuery(() => db.expenseTypes.toArray(), []);
  const groups = useLiveQuery(() => db.groups.toArray(), []);
  const colors = useLiveQuery(() => db.colors.toArray(), []);
  const typeUsage = useUsageCounts('expenseTypeId');
  const groupUsage = useUsageCounts('groupId');

  const [date, setDate] = useState(existing?.date ?? todayIso());
  const [expr, setExpr] = useState(existing ? plainAmount(existing.amountCents) : '');
  const [typeId, setTypeId] = useState(existing?.expenseTypeId ?? '');
  const [groupId, setGroupId] = useState(existing?.groupId ?? '');
  const [colorId, setColorId] = useState(existing?.colorId ?? '');
  const [note, setNote] = useState(existing?.note ?? '');
  const [repeatOn, setRepeatOn] = useState(false);
  const [repeatMonths, setRepeatMonths] = useState('3');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (types === undefined || groups === undefined || colors === undefined) {
    return <main className={styles.page}><p>Loading…</p></main>;
  }

  // Hidden items are not offered, except the one this expense already uses.
  const typeOptions = sortByUsage(
    types.filter((t) => !t.hidden || t.id === existing?.expenseTypeId),
    typeUsage ?? new Map<string, number>(),
  );
  const groupOptions = sortByUsage(
    groups.filter((g) => !g.hidden || g.id === existing?.groupId),
    groupUsage ?? new Map<string, number>(),
  );
  const colorOptions = colors
    .filter((c) => !c.hidden || c.id === existing?.colorId)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const amount = evaluateAmount(expr);
  const repeatCount = repeatOn ? Number(repeatMonths) : 0;
  const repeatValid = !repeatOn || (Number.isInteger(repeatCount) && repeatCount >= 1 && repeatCount <= MAX_REPEAT_MONTHS);

  let problem: string | null = null;
  if (!amount.ok) {
    problem =
      amount.error === 'empty' ? 'Enter an amount'
      : amount.error === 'divide-by-zero' ? 'Cannot divide by zero'
      : 'Check the amount';
  } else if (typeOptions.length === 0) problem = 'There are no expense types yet';
  else if (typeId === '') problem = 'Select a type';
  else if (!isValidIsoDate(date)) problem = 'Enter a valid date';
  else if (!repeatValid) problem = `Repeat for 1 to ${MAX_REPEAT_MONTHS} months`;

  const goBack = () => {
    if (location.key !== 'default') navigate(-1);
    else navigate('/', { replace: true });
  };

  async function save() {
    if (problem !== null || !amount.ok || saving) return;
    setSaving(true);
    setError(null);
    try {
      const nowIso = new Date().toISOString();
      if (existing) {
        await db.expenses.put({
          ...existing,
          date,
          amountCents: amount.cents,
          expenseTypeId: typeId,
          groupId: groupId || null,
          colorId: colorId || null,
          note: note.trim(),
          updatedAt: nowIso,
        });
        snackbar.show({ message: 'Expense updated' });
        goBack();
      } else {
        const rows = buildExpenseRows(
          { date, amountCents: amount.cents, expenseTypeId: typeId, groupId: groupId || null, colorId: colorId || null, note, repeatMonths: repeatCount },
          () => crypto.randomUUID(),
          nowIso,
        );
        await db.expenses.bulkAdd(rows);
        snackbar.show({ message: rows.length > 1 ? `Saved ${rows.length} expenses` : 'Expense saved' });
        navigate('/', { replace: true });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  }

  async function remove() {
    if (!existing) return;
    const deleted = existing;
    await db.expenses.delete(deleted.id);
    snackbar.show({
      message: 'Expense deleted',
      actionLabel: 'Undo',
      onAction: () => void db.expenses.put(deleted),
    });
    goBack();
  }

  return (
    <main className={styles.page}>
      <div className={styles.bar}>
        <button type="button" className={styles.save} disabled={problem !== null || saving} onClick={() => void save()}>
          Save
        </button>
        <button type="button" className={styles.cancel} onClick={goBack}>
          Cancel
        </button>
      </div>

      <h1>{existing ? 'Edit expense' : 'Add new expense'}</h1>
      {problem !== null && <p className={styles.hint}>{problem}</p>}
      {error !== null && <p className={styles.error}>{error}</p>}
      {types.length === 0 && (
        <p className={styles.hint}>
          Restore your data first: <Link to="/setup">Setup</Link>.
        </p>
      )}

      <div className={`${styles.field} ${styles.row}`}>
        <div>
          <label className={styles.label} htmlFor="date">Date</label>
          <input id="date" className={styles.input} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        {!existing && (
          <div>
            <label className={styles.label} htmlFor="repeat-on">Repeats × months</label>
            <div className={styles.repeat}>
              <input
                id="repeat-on"
                className={styles.check}
                type="checkbox"
                checked={repeatOn}
                onChange={(e) => setRepeatOn(e.target.checked)}
              />
              <input
                className={styles.input}
                type="number"
                inputMode="numeric"
                min={1}
                max={MAX_REPEAT_MONTHS}
                disabled={!repeatOn}
                value={repeatMonths}
                aria-label="Number of months"
                onChange={(e) => setRepeatMonths(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>
      {existing?.seriesId && (
        <p className={styles.hint}>Part of a repeating series. Changes apply to this row only.</p>
      )}

      <div className={styles.field}>
        <span className={styles.label}>Amount</span>
        <AmountKeypad value={expr} onChange={setExpr} />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="type">Type</label>
        <select id="type" className={styles.select} value={typeId} onChange={(e) => setTypeId(e.target.value)}>
          <option value="">Select a type…</option>
          {typeOptions.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="note">Remark</label>
        <textarea id="note" className={styles.textarea} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="group">Group</label>
        <select id="group" className={styles.select} value={groupId} onChange={(e) => setGroupId(e.target.value)}>
          <option value="">No group</option>
          {groupOptions.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <span className={styles.label}>Highlight color</span>
        <div className={styles.colors} role="group" aria-label="Highlight color">
          <button type="button" className={styles.chip} aria-pressed={colorId === ''} onClick={() => setColorId('')}>
            None
          </button>
          {colorOptions.map((c) => (
            <button
              key={c.id}
              type="button"
              className={styles.chip}
              style={{ background: c.hex }}
              aria-pressed={colorId === c.id}
              onClick={() => setColorId(c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {existing && (
        <button type="button" className={styles.delete} onClick={() => void remove()}>
          Delete expense
        </button>
      )}
    </main>
  );
}
