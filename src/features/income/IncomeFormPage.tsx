import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { AmountCard } from '../../components/amount/AmountCard';
import { Keypad } from '../../components/amount/Keypad';
import { BackIcon, CalendarIcon, TrashIcon } from '../../components/icons';
import { useSnackbar } from '../../components/Snackbar';
import { db } from '../../db/db';
import type { Income } from '../../db/schema';
import { formatChipDate, isValidIsoDate, todayIso } from '../../domain/dates';
import { flagsFor, INCOME_KINDS, kindOf, type IncomeKind } from '../../domain/incomeFilter';
import { amountView, evaluateAmount } from '../../domain/keypad';
import { formatCsvAmount } from '../../domain/money';
import form from '../expense-form/ExpenseForm.module.css';
import styles from './IncomeForm.module.css';

/** `/income/new` creates, `/income/:id` edits. */
export function IncomeFormPage() {
  const { id } = useParams();
  if (id === undefined) return <IncomeForm />;
  return <EditIncome id={id} />;
}

function EditIncome({ id }: { id: string }) {
  const income = useLiveQuery(async () => (await db.incomes.get(id)) ?? null, [id]);
  if (income === undefined) return <div className={form.screen} />;
  if (income === null) {
    return <main className="page"><p>This income entry no longer exists.</p><Link to="/income">Back to Income</Link></main>;
  }
  return <IncomeForm key={income.id} existing={income} />;
}

const plainAmount = (cents: number) => formatCsvAmount(cents).replace(/,00$/, '');

function IncomeForm({ existing }: { existing?: Income }) {
  const navigate = useNavigate();
  const location = useLocation();
  const snackbar = useSnackbar();
  const remarkRef = useRef<HTMLTextAreaElement>(null);

  const [date, setDate] = useState(existing?.date ?? todayIso());
  const [expr, setExpr] = useState(existing ? plainAmount(existing.amountCents) : '');
  const [kind, setKind] = useState<IncomeKind>(existing ? kindOf(existing) : 'regular');
  const [note, setNote] = useState(existing?.note ?? '');
  const [keypadOpen, setKeypadOpen] = useState(true);
  const [focusRemark, setFocusRemark] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (focusRemark && !keypadOpen) { remarkRef.current?.focus(); setFocusRemark(false); }
  }, [focusRemark, keypadOpen]);

  const amount = evaluateAmount(expr);
  const view = amountView(expr);
  let problem: string | null = null;
  if (view.state === 'error') problem = 'Fix the calculation to save';
  else if (!amount.ok) problem = 'Enter an amount';
  else if (!isValidIsoDate(date)) problem = 'Enter a valid date';

  const goBack = () => {
    if (location.key !== 'default') navigate(-1);
    else navigate('/income', { replace: true });
  };

  async function save() {
    if (problem !== null || !amount.ok || saving) return;
    setSaving(true);
    setError(null);
    try {
      const nowIso = new Date().toISOString();
      const fields = { date, amountCents: amount.cents, note: note.trim(), ...flagsFor(kind), updatedAt: nowIso };
      if (existing) {
        await db.incomes.put({ ...existing, ...fields });
        snackbar.show({ message: 'Income updated' });
      } else {
        await db.incomes.add({ id: crypto.randomUUID(), createdAt: nowIso, ...fields });
        snackbar.show({ message: 'Income saved' });
      }
      goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  }

  async function remove() {
    if (!existing) return;
    const deleted = existing;
    await db.incomes.delete(deleted.id);
    snackbar.show({ message: 'Income deleted', actionLabel: 'Undo', onAction: () => void db.incomes.put(deleted) });
    goBack();
  }

  return (
    <div className={form.screen}>
      <header className={form.header}>
        <button type="button" className={form.iconButton} aria-label="Back without saving" onClick={goBack}><BackIcon /></button>
        <h1 className={form.title}>{existing ? 'Edit income' : 'New income'}</h1>
        {existing && <button type="button" className={form.delete} onClick={() => void remove()}><TrashIcon />Delete</button>}
      </header>

      <div className={form.scroll}>
        <AmountCard expr={expr} keypadOpen={keypadOpen} onToggle={() => setKeypadOpen((o) => !o)} />

        <span className={styles.kindLabel} id="kind-label">Kind</span>
        <div className={styles.kinds} role="group" aria-labelledby="kind-label">
          {INCOME_KINDS.map((k) => (
            <button key={k.id} type="button" className={form.chip} aria-pressed={kind === k.id} onClick={() => setKind(k.id)}>{k.label}</button>
          ))}
        </div>

        <div className={form.row}>
          <label className={`${form.chip} ${form.grow} ${form.date}`}>
            <CalendarIcon className={form.chipIcon} />
            <span className={form.chipLabel}>{isValidIsoDate(date) ? formatChipDate(date) : 'Pick a date'}</span>
            <input className={form.nativeOverlay} type="date" aria-label="Date" value={date} required
              onChange={(e) => e.target.value && setDate(e.target.value)} />
          </label>
          {keypadOpen && (
            <button type="button" className={`${form.chip} ${form.grow}`} style={note.trim() ? undefined : { color: 'var(--muted)' }}
              onClick={() => { setKeypadOpen(false); setFocusRemark(true); }}>
              <span className={form.chipLabel}>{note.trim() || 'Remark'}</span>
            </button>
          )}
        </div>

        {!keypadOpen && (
          <section className={form.section}>
            <label className={form.label} htmlFor="remark">Remark</label>
            <textarea id="remark" ref={remarkRef} className={form.textarea} rows={4} value={note} onChange={(e) => setNote(e.target.value)} />
          </section>
        )}
      </div>

      <div className={form.bottom}>
        {keypadOpen && <Keypad value={expr} onChange={setExpr} />}
        <p className={`${form.hint} ${error ? form.hintError : ''}`} role="status">{error ?? problem ?? ''}</p>
        <footer className={form.footer}>
          <button type="button" className={form.save} disabled={problem !== null || saving} onClick={() => void save()}>Save income</button>
        </footer>
      </div>
    </div>
  );
}
