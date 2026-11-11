import { memo } from 'react';
import { ClockIcon } from '../../components/icons';
import type { Expense } from '../../db/schema';
import { weekdayShort } from '../../domain/dates';
import { formatCents } from '../../domain/money';
import { useLongPress } from './useLongPress';
import styles from './Expenses.module.css';

interface Props {
  expense: Expense;
  typeName: string;
  groupName: string | null;
  color: { name: string; hex: string } | null;
  scheduled: boolean;
  selectMode: boolean;
  selected: boolean;
  /** exclusion mode: a tap leaves the row out of the running total */
  excludeMode: boolean;
  excluded: boolean;
  onOpen: (id: string) => void;
  onToggle: (id: string) => void;
  onStartSelect: (id: string) => void;
  onToggleExclude: (id: string) => void;
}

export const ExpenseRow = memo(function ExpenseRow({
  expense, typeName, groupName, color, scheduled, selectMode, selected, excludeMode, excluded, onOpen, onToggle, onStartSelect, onToggleExclude,
}: Props) {
  const longPress = useLongPress(() => {
    if (!selectMode && !excludeMode) onStartSelect(expense.id);
  });
  const refund = expense.amountCents < 0;
  const note = expense.note.trim();

  return (
    <button
      type="button"
      className={`${styles.row} ${excluded ? styles.rowExcluded : ''}`}
      aria-pressed={selectMode ? selected : excludeMode ? excluded : undefined}
      aria-label={excludeMode ? `${typeName} ${formatCents(expense.amountCents)}, ${excluded ? 'excluded from' : 'counted in'} the total` : undefined}
      {...longPress.handlers}
      onClick={() => {
        if (longPress.consumed()) return;
        if (excludeMode) onToggleExclude(expense.id);
        else if (selectMode) onToggle(expense.id);
        else onOpen(expense.id);
      }}
    >
      {color && <span className={styles.stripe} style={{ background: color.hex }} aria-label={`Highlight ${color.name}`} />}
      <span className={styles.day}>
        <span className={styles.dayName}>{weekdayShort(expense.date)}</span>
        <span className={styles.dayNum}>{expense.date.slice(8, 10)}</span>
      </span>
      <span className={styles.body}>
        <span className={styles.type}>
          <span className={styles.typeName}>{typeName}</span>
          {scheduled && <span className={styles.badge}><ClockIcon size={11} />Scheduled</span>}
        </span>
        {(note || groupName) && (
          <span className={`${styles.remark} ${selected ? styles.remarkFull : ''}`} style={{ display: 'block' }}>
            {note}
            {groupName && <span className={styles.groupName}>{note ? ' · ' : ''}{groupName}</span>}
          </span>
        )}
      </span>
      <span className={`${styles.amount} ${refund ? styles.amountRefund : scheduled ? styles.amountScheduled : ''}`}>
        {formatCents(expense.amountCents)}
      </span>
    </button>
  );
});
