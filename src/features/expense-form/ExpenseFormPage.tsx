import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { AmountCard } from '../../components/amount/AmountCard';
import { Keypad } from '../../components/amount/Keypad';
import { BottomSheet } from '../../components/BottomSheet';
import {
  BackIcon, CalendarIcon, CheckIcon, ChevronDown, RepeatIcon, SlashIcon, TagIcon, TrashIcon,
} from '../../components/icons';
import { useSnackbar } from '../../components/Snackbar';
import { db } from '../../db/db';
import { useUsageCounts } from '../../db/hooks';
import type { Expense, ExpenseType } from '../../db/schema';
import { formatChipDate, formatDmy, isValidIsoDate, todayIso } from '../../domain/dates';
import { amountView, evaluateAmount } from '../../domain/keypad';
import { formatCsvAmount } from '../../domain/money';
import { MAX_REPEAT_MONTHS, repeatDates } from '../../domain/repeats';
import { sortByUsage } from '../../domain/usage';
import { buildExpenseRows } from './buildRows';
import styles from './ExpenseForm.module.css';

/** How many type chips are shown before "All N". */
const TOP_TYPES = 7;
const DEFAULT_REPEAT = 3;

/** `/expenses/new` creates, `/expenses/:id` edits one row. */
export function ExpenseFormPage() {
  const { id } = useParams();
  if (id === undefined) return <ExpenseForm />;
  return <EditExpense id={id} />;
}

function EditExpense({ id }: { id: string }) {
  const expense = useLiveQuery(async () => (await db.expenses.get(id)) ?? null, [id]);
  if (expense === undefined) return <div className={styles.screen} />;
  if (expense === null) {
    return (
      <main className="page">
        <p>This expense no longer exists.</p>
        <Link to="/">Back to Home</Link>
      </main>
    );
  }
  return <ExpenseForm key={expense.id} existing={expense} />;
}

/** Amount as editable keypad text: `12`, `12,5`, `-5,25`. */
const plainAmount = (cents: number) => formatCsvAmount(cents).replace(/,00$/, '');

function ExpenseForm({ existing }: { existing?: Expense }) {
  const navigate = useNavigate();
  const location = useLocation();
  const snackbar = useSnackbar();
  const remarkRef = useRef<HTMLTextAreaElement>(null);

  const types = useLiveQuery(() => db.expenseTypes.toArray(), []);
  const groups = useLiveQuery(() => db.groups.toArray(), []);
  const colors = useLiveQuery(() => db.colors.toArray(), []);
  const typeUsage = useUsageCounts('expenseTypeId');
  const groupUsage = useUsageCounts('groupId');

  const today = todayIso();
  const [date, setDate] = useState(existing?.date ?? today);
  const [expr, setExpr] = useState(existing ? plainAmount(existing.amountCents) : '');
  const [typeId, setTypeId] = useState(existing?.expenseTypeId ?? '');
  const [groupId, setGroupId] = useState(existing?.groupId ?? '');
  const [colorId, setColorId] = useState(existing?.colorId ?? '');
  const [note, setNote] = useState(existing?.note ?? '');
  const [repeatOn, setRepeatOn] = useState(false);
  const [repeatMonths, setRepeatMonths] = useState(DEFAULT_REPEAT);
  // Adding starts with the keypad; editing starts with the details.
  const [keypadOpen, setKeypadOpen] = useState(!existing);
  const [typeSheetOpen, setTypeSheetOpen] = useState(false);
  const [focusRemark, setFocusRemark] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const closeTypeSheet = useCallback(() => setTypeSheetOpen(false), []);

  useEffect(() => {
    if (focusRemark && !keypadOpen) {
      remarkRef.current?.focus();
      setFocusRemark(false);
    }
  }, [focusRemark, keypadOpen]);

  if (types === undefined || groups === undefined || colors === undefined) {
    return <div className={styles.screen} />;
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
  const selectedColor = colorOptions.find((c) => c.id === colorId);

  // Top types as chips; a selected type outside the top takes the last chip.
  let chipTypes: ExpenseType[] = typeOptions.slice(0, TOP_TYPES);
  const selectedType = typeOptions.find((t) => t.id === typeId);
  if (selectedType && !chipTypes.includes(selectedType)) chipTypes = [...chipTypes.slice(0, TOP_TYPES - 1), selectedType];

  const amount = evaluateAmount(expr);
  const view = amountView(expr);
  const repeatCount = !existing && repeatOn ? repeatMonths : 0;
  const noTypes = typeOptions.length === 0;

  let problem: string | null = null;
  if (noTypes) problem = 'Add a type in Setup first';
  else if (view.state === 'error') problem = 'Fix the calculation to save';
  else if (!amount.ok) problem = 'Enter an amount';
  else if (typeId === '') problem = 'Select a type';
  else if (!isValidIsoDate(date)) problem = 'Enter a valid date';

  const negative = amount.ok && amount.cents < 0;
  const saveLabel = existing
    ? 'Save changes'
    : repeatCount > 0
      ? `Save ${repeatCount + 1} expenses`
      : negative
        ? 'Save refund'
        : 'Save expense';

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
          {
            date, amountCents: amount.cents, expenseTypeId: typeId, groupId: groupId || null,
            colorId: colorId || null, note, repeatMonths: repeatCount,
          },
          () => crypto.randomUUID(),
          nowIso,
        );
        await db.expenses.bulkAdd(rows);
        snackbar.show({ message: rows.length > 1 ? `Saved ${rows.length} expenses` : negative ? 'Refund saved' : 'Expense saved' });
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
    snackbar.show({ message: 'Expense deleted', actionLabel: 'Undo', onAction: () => void db.expenses.put(deleted) });
    goBack();
  }

  const lastRepeat = repeatCount > 0 && isValidIsoDate(date) ? repeatDates(date, repeatCount).at(-1) : undefined;

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <button type="button" className={styles.iconButton} aria-label="Back without saving" onClick={goBack}>
          <BackIcon />
        </button>
        <h1 className={styles.title}>{existing ? 'Edit expense' : 'New expense'}</h1>
        {existing && (
          <button type="button" className={styles.delete} onClick={() => void remove()}>
            <TrashIcon />Delete
          </button>
        )}
      </header>

      <div className={styles.scroll}>
        {existing?.seriesId && (
          <div className={styles.series}>
            <RepeatIcon size={18} />
            <span>Part of a repeating series. Changes apply to this row only.</span>
          </div>
        )}

        <AmountCard
          expr={expr}
          keypadOpen={keypadOpen}
          scheduled={isValidIsoDate(date) && date > today}
          onToggle={() => setKeypadOpen((open) => !open)}
        />

        {noTypes ? (
          <section className={styles.empty}>
            <div className={styles.emptyHead}>
              <span className={styles.emptyIcon}><TagIcon /></span>
              <div>
                <div className={styles.emptyTitle}>No expense types yet</div>
                <div className={styles.emptyText}>Create your types in Setup, or restore a backup to bring back all your data.</div>
              </div>
            </div>
            <div className={styles.emptyActions}>
              <Link className={styles.linkPrimary} to="/setup">Open Setup</Link>
              <Link className={styles.linkSecondary} to="/setup">Restore backup</Link>
            </div>
          </section>
        ) : (
          <section className={styles.types} aria-label="Type">
            {chipTypes.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`${styles.chip} ${styles.typeChip} ${t.name.length > 10 ? styles.typeChipLong : ''}`}
                aria-pressed={t.id === typeId}
                title={t.name}
                onClick={() => setTypeId(t.id)}
              >
                <span className={styles.chipLabel}>{t.name}</span>
              </button>
            ))}
            {typeOptions.length > chipTypes.length && (
              <button type="button" className={`${styles.chip} ${styles.chipAll}`} onClick={() => setTypeSheetOpen(true)}>
                All {typeOptions.length}
              </button>
            )}
          </section>
        )}

        <div className={styles.row}>
          <label className={`${styles.chip} ${styles.grow} ${styles.date}`}>
            <CalendarIcon className={styles.chipIcon} />
            <span className={styles.chipLabel}>{isValidIsoDate(date) ? formatChipDate(date) : 'Pick a date'}</span>
            <input
              className={styles.nativeOverlay}
              type="date"
              aria-label="Date"
              value={date}
              required
              onChange={(e) => e.target.value && setDate(e.target.value)}
            />
          </label>
          {!existing && (
            <button type="button" className={styles.chip} aria-pressed={repeatOn} onClick={() => setRepeatOn((on) => !on)}>
              {repeatOn && <RepeatIcon />}Repeat
            </button>
          )}
        </div>

        {repeatCount > 0 && lastRepeat && (
          <section className={styles.repeat} aria-label="Repeat">
            <div className={styles.repeatHead}>
              <span className={styles.repeatTitle} id="repeat-title">Repeat monthly for</span>
              <div className={styles.stepper} role="group" aria-labelledby="repeat-title">
                <button
                  type="button" className={styles.stepButton} aria-label="Fewer months"
                  disabled={repeatMonths <= 1} onClick={() => setRepeatMonths((n) => Math.max(1, n - 1))}
                >−</button>
                <output className={styles.stepValue} aria-live="polite">{repeatMonths}</output>
                <button
                  type="button" className={styles.stepButton} aria-label="More months"
                  disabled={repeatMonths >= MAX_REPEAT_MONTHS} onClick={() => setRepeatMonths((n) => Math.min(MAX_REPEAT_MONTHS, n + 1))}
                >+</button>
              </div>
            </div>
            <p className={styles.repeatNote}>
              Creates {repeatCount + 1} expenses, monthly from {formatDmy(date)} to {formatDmy(lastRepeat)}. Future ones show as scheduled.
            </p>
          </section>
        )}

        {keypadOpen ? (
          <div className={`${styles.row} ${styles.rowTight}`}>
            <button
              type="button"
              className={styles.chip}
              style={{ maxWidth: '38%' }}
              onClick={() => { setKeypadOpen(false); setFocusRemark(true); }}
            >
              <span className={styles.chipLabel}>{note.trim() || 'Remark'}</span>
            </button>
            <label className={`${styles.chip} ${styles.grow} ${styles.spread} ${groupId ? '' : styles.chipMuted}`}>
              <span className={styles.chipLabel}>{groupOptions.find((g) => g.id === groupId)?.name ?? 'No group'}</span>
              <ChevronDown size={14} />
              <select className={styles.nativeOverlay} aria-label="Group" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
                <option value="">No group</option>
                {groupOptions.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </label>
            <button
              type="button"
              className={styles.chip}
              aria-label={`Highlight colour: ${selectedColor?.name ?? 'none'}`}
              onClick={() => setKeypadOpen(false)}
            >
              <span className={`${styles.dot} ${selectedColor ? '' : styles.dotNone}`} style={selectedColor ? { background: selectedColor.hex } : undefined} />
              {selectedColor?.name ?? 'Colour'}
            </button>
          </div>
        ) : (
          <>
            <section className={styles.section}>
              <label className={styles.label} htmlFor="remark">Remark</label>
              <textarea
                id="remark" ref={remarkRef} className={styles.textarea} rows={4}
                value={note} onChange={(e) => setNote(e.target.value)}
              />
            </section>
            <section className={styles.section}>
              <label className={styles.label} htmlFor="group">Group</label>
              <div className={styles.selectBox}>
                <select id="group" className={styles.select} value={groupId} onChange={(e) => setGroupId(e.target.value)}>
                  <option value="">No group</option>
                  {groupOptions.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
                <ChevronDown size={16} className={styles.selectArrow} />
              </div>
            </section>
            <section className={styles.section}>
              <div className={styles.label} id="colour-label">
                Highlight colour · <strong>{selectedColor?.name ?? 'None'}</strong>
              </div>
              <div className={styles.swatches} role="group" aria-labelledby="colour-label">
                <button
                  type="button" className={`${styles.swatch} ${styles.swatchNone}`}
                  aria-label="No colour" aria-pressed={colorId === ''} onClick={() => setColorId('')}
                >
                  <SlashIcon />
                </button>
                {colorOptions.map((c) => (
                  <button
                    key={c.id} type="button" className={styles.swatch} style={{ background: c.hex }}
                    aria-label={c.name} aria-pressed={colorId === c.id} onClick={() => setColorId(c.id)}
                  >
                    {colorId === c.id && <CheckIcon />}
                  </button>
                ))}
              </div>
            </section>
          </>
        )}
      </div>

      <div className={styles.bottom}>
        {keypadOpen && <Keypad value={expr} onChange={setExpr} />}
        {/* always rendered with a fixed height, so nothing above it moves when the message changes */}
        <p className={`${styles.hint} ${error ? styles.hintError : ''}`} role="status">{error ?? problem ?? ''}</p>
        <footer className={styles.footer}>
          <button type="button" className={styles.save} disabled={problem !== null || saving} onClick={() => void save()}>
            {saveLabel}
          </button>
        </footer>
      </div>

      {typeSheetOpen && (
        <BottomSheet title="Type" onClose={closeTypeSheet}>
          <div className={styles.sheetList}>
            {typeOptions.map((t) => (
              <button
                key={t.id}
                type="button"
                className={styles.sheetItem}
                aria-pressed={t.id === typeId}
                onClick={() => { setTypeId(t.id); setTypeSheetOpen(false); }}
              >
                <span>{t.name}</span>
                <span className={styles.sheetCount}>{typeUsage?.get(t.id) ?? 0}</span>
              </button>
            ))}
          </div>
        </BottomSheet>
      )}
    </div>
  );
}
