import { memo } from 'react';
import type { Income } from '../../db/schema';
import { weekdayShort } from '../../domain/dates';
import { kindOf } from '../../domain/incomeFilter';
import { formatCents } from '../../domain/money';
import { useLongPress } from '../expenses/useLongPress';
import rowStyles from '../expenses/Expenses.module.css';
import styles from './Income.module.css';

interface Props {
  income: Income;
  selectMode: boolean;
  selected: boolean;
  onOpen: (id: string) => void;
  onToggle: (id: string) => void;
  onStartSelect: (id: string) => void;
}

export const IncomeRow = memo(function IncomeRow({ income, selectMode, selected, onOpen, onToggle, onStartSelect }: Props) {
  const longPress = useLongPress(() => { if (!selectMode) onStartSelect(income.id); });
  const kind = kindOf(income);
  const note = income.note.trim();
  return (
    <button
      type="button"
      className={rowStyles.row}
      style={{ minHeight: 56, paddingLeft: 14 }}
      aria-pressed={selectMode ? selected : undefined}
      {...longPress.handlers}
      onClick={() => {
        if (longPress.consumed()) return;
        if (selectMode) onToggle(income.id); else onOpen(income.id);
      }}
    >
      <span className={rowStyles.day}>
        <span className={rowStyles.dayName}>{weekdayShort(income.date)}</span>
        <span className={rowStyles.dayNum}>{income.date.slice(8, 10)}</span>
      </span>
      <span className={rowStyles.body}>
        <span className={`${styles.note} ${note ? '' : styles.noteEmpty}`}>{note || 'Income'}</span>
        {kind === 'dividend' && <span className={`${styles.badge} ${styles.badgeDividend}`}>Dividend</span>}
        {kind === 'stockSale' && <span className={`${styles.badge} ${styles.badgeStock}`}>Stock sale</span>}
      </span>
      <span className={`${rowStyles.amount} ${income.amountCents < 0 ? styles.amountNeg : ''}`}>{formatCents(income.amountCents)}</span>
    </button>
  );
});
