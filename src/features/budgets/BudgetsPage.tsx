import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { BottomSheet } from '../../components/BottomSheet';
import { BackIcon, ChevronRight, InfoIcon, PieIcon, PlusIcon } from '../../components/icons';
import { useSnackbarPlacement } from '../../components/Snackbar';
import { NAV_HEIGHT } from '../../app/TabLayout';
import { db } from '../../db/db';
import { useSettings } from '../../db/hooks';
import { addMonthsToKey, monthKeyOf, todayIso } from '../../domain/dates';
import { barGradient, budgetView, TONE_COLOR, type BudgetCell, type BudgetRow, type MonthTone } from '../../domain/budgets';
import { monthName } from '../../domain/expenseFilter';
import { formatCents } from '../../domain/money';
import styles from './Budgets.module.css';

/** Focal month survives leaving the tab and coming back. */
let rememberedFocal: string | null = null;

const KEY: { tone: MonthTone; title: string; text: string }[] = [
  { tone: 'below', title: 'Below usual', text: 'Clearly less than you normally spend on this type.' },
  { tone: 'usual', title: 'Usual', text: 'Within your normal range.' },
  { tone: 'above', title: 'Above usual', text: 'Over the upper end of your normal range.' },
  { tone: 'wayAbove', title: 'Way above usual', text: 'Far over it: more than twice the usual spread above the median.' },
  { tone: 'none', title: 'No data yet', text: 'A future month without expenses.' },
];

export function BudgetsPage() {
  const today = todayIso();
  const [focal, setFocalState] = useState(() => rememberedFocal ?? monthKeyOf(today));
  const setFocal = (m: string) => { rememberedFocal = m; setFocalState(m); };
  const [keyOpen, setKeyOpen] = useState(false);
  const closeKey = useCallback(() => setKeyOpen(false), []);
  useSnackbarPlacement(NAV_HEIGHT + 16, 84);

  const expenses = useLiveQuery(() => db.expenses.toArray(), []);
  const types = useLiveQuery(() => db.expenseTypes.toArray(), []);
  const settings = useSettings();
  const size = settings?.usualWindowMonths ?? 12;

  const view = useMemo(
    () => (expenses && types ? budgetView(expenses, types, focal, today, size) : null),
    [expenses, types, focal, today, size],
  );

  if (!view || !expenses) return <div className={styles.screen} />;

  if (expenses.length === 0) {
    return (
      <div className={styles.screen}>
        <header className={styles.header}><h1 className={styles.title}>Budgets</h1></header>
        <div className={styles.empty}>
          <span className={styles.emptyIcon}><PieIcon size={28} /></span>
          <div className={styles.emptyTitle}>Nothing to compare yet</div>
          <div className={styles.emptyText}>Once you add expenses, each type's spending shows up here month by month, next to what's usual for it.</div>
          <div className={styles.emptyActions}>
            <Link className={styles.pillPrimary} to="/expenses/new">Add expense</Link>
            <Link className={styles.pillSecondary} to="/setup">Restore backup</Link>
          </div>
        </div>
      </div>
    );
  }

  const thisYear = today.slice(0, 4);
  const chipLabel = (m: string) => `${monthName(m).slice(0, 3)}${m.slice(0, 4) === thisYear ? '' : ` ${m.slice(2, 4)}`}`;

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>Budgets</h1>
        <div className={styles.arrows}>
          <button type="button" className={styles.arrow} aria-label="Previous month" onClick={() => setFocal(addMonthsToKey(focal, -1))}><BackIcon size={20} /></button>
          <button type="button" className={styles.arrow} aria-label="Next month" onClick={() => setFocal(addMonthsToKey(focal, 1))}><ChevronRight size={20} /></button>
        </div>
      </header>
      <div className={styles.months}>
        {view.months.map((m) => (
          <button key={m} type="button" className={styles.month} aria-current={m === focal ? 'true' : undefined} onClick={() => setFocal(m)}>
            {chipLabel(m)}
          </button>
        ))}
      </div>

      <div className={styles.list}>
        {!view.hasHistory && (
          <div className={styles.info}>
            <InfoIcon size={14} />
            <span>Usual values per type appear after {size} complete months. Until then you see actual spending only.</span>
          </div>
        )}
        <Block row={view.total} total hasHistory={view.hasHistory} onInfo={() => setKeyOpen(true)}
          deltaFor={(i) => {
            const d = view.total.deltas[i];
            if (!view.hasHistory) return undefined;
            if (d === null || d === undefined) return '–';
            const text = `${d > 0 ? '+' : d < 0 ? '−' : ''}${formatCents(Math.abs(d))}`;
            return view.total.cells[i]!.kind === 'current' ? `${text} by day ${view.total.day}` : text;
          }} />
        {view.rows.map((row) => <Block key={row.typeId} row={row} hasHistory={view.hasHistory} />)}
      </div>

      <Link className={styles.fab} to="/expenses/new" aria-label="Add expense"><PlusIcon size={24} /></Link>

      {keyOpen && (
        <BottomSheet title="What the bars mean" onClose={closeKey} headerAction={<span />}
          footer={<button type="button" className={styles.gotIt} onClick={closeKey}>Got it</button>}>
          <p className={styles.keyIntro}>
            Each bar blends the colours of the three months shown above it. Usual = your median over the last {size} months
            (change in Setup). A month in progress only turns amber or red once it is already over.
          </p>
          {KEY.map((k) => (
            <div key={k.tone} className={styles.keyItem}>
              <span className={styles.keySwatch} style={{ background: TONE_COLOR[k.tone] }} />
              <div><div className={styles.keyTitle}>{k.title}</div><div className={styles.keyText}>{k.text}</div></div>
            </div>
          ))}
        </BottomSheet>
      )}
    </div>
  );
}

function Block({ row, total = false, hasHistory, onInfo, deltaFor }: {
  row: BudgetRow;
  total?: boolean;
  hasHistory: boolean;
  onInfo?: () => void;
  deltaFor?: (i: number) => string | undefined;
}) {
  const toneWord: Record<MonthTone, string> = { below: 'below usual', usual: 'usual', above: 'above usual', wayAbove: 'way above usual', none: 'no data' };
  return (
    <section className={styles.block} aria-label={row.name}>
      <div className={styles.blockHead}>
        <h2 className={`${styles.name} ${total ? styles.nameTotal : ''}`}>
          {row.name}
          {onInfo && <button type="button" className={styles.infoButton} aria-label="What the colours mean" onClick={onInfo}><span>i</span></button>}
        </h2>
        {hasHistory && row.usualCents !== null && (
          <span className={styles.usual}>usual <span>{formatCents(row.usualCents)}</span></span>
        )}
      </div>
      <div className={styles.cells}>
        {row.cells.map((cell, i) => <Cell key={cell.month} cell={cell} focal={i === 1} total={total} delta={deltaFor?.(i)} />)}
      </div>
      {hasHistory && (
        <div className={styles.bar} style={{ background: barGradient(row.cells.map((c) => c.tone)) }} role="img"
          aria-label={`Status by month: ${row.cells.map((c) => `${monthName(c.month)} ${toneWord[c.tone]}`).join(', ')}`} />
      )}
    </section>
  );
}

function Cell({ cell, focal, total, delta }: { cell: BudgetCell; focal: boolean; total: boolean; delta?: string }) {
  const zero = cell.valueCents === 0;
  return (
    <div className={`${styles.cell} ${total ? styles.cellTotal : ''} ${focal ? styles.cellFocal : ''}`}>
      <div className={`${styles.value} ${zero ? styles.dash : ''} ${cell.valueCents < 0 ? styles.refund : ''}`}>
        {zero ? '–' : formatCents(cell.valueCents)}
      </div>
      {delta !== undefined && <div className={styles.delta}>{delta}</div>}
    </div>
  );
}
