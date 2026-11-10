import { useState } from 'react';
import { BottomSheet } from '../../components/BottomSheet';
import { CalendarIcon, CheckIcon } from '../../components/icons';
import { formatChipDate, isValidIsoDate } from '../../domain/dates';
import { activeRange, DATE_PRESETS, type DatePreset, type DateRange, type ExpenseFilter } from '../../domain/expenseFilter';
import styles from './Expenses.module.css';

interface SheetProps {
  filter: ExpenseFilter;
  today: string;
  /** how many expenses a draft filter would show */
  countFor: (filter: ExpenseFilter) => number;
  onApply: (filter: ExpenseFilter) => void;
  onClose: () => void;
}

const showLabel = (n: number) => `Show ${n.toLocaleString('de-DE')} ${n === 1 ? 'expense' : 'expenses'}`;

function ClearButton({ onClick }: { onClick: () => void }) {
  return <button type="button" className={styles.textButton} onClick={onClick}>Clear</button>;
}

export function DateSheet({ filter, today, countFor, onApply, onClose }: SheetProps) {
  const [preset, setPreset] = useState<DatePreset | null>(filter.preset);
  const [range, setRange] = useState<DateRange | null>(filter.range);
  const draft = { ...filter, preset, range };
  // the custom range fields start from whatever is active, or this month
  const shown = activeRange(draft, today) ?? activeRange({ ...filter, preset: 'this-month', range: null }, today)!;

  const setDate = (which: 'from' | 'to', value: string) => {
    if (!isValidIsoDate(value)) return;
    let next = { ...shown, [which]: value };
    if (next.from > next.to) next = { from: next.to, to: next.from };
    setPreset(null);
    setRange(next);
  };

  return (
    <BottomSheet
      title="Date"
      onClose={onClose}
      headerAction={<ClearButton onClick={() => onApply({ ...filter, preset: null, range: null })} />}
      footer={<button type="button" className={styles.showButton} onClick={() => onApply(draft)}>{showLabel(countFor(draft))}</button>}
    >
      <div className={styles.presets}>
        {DATE_PRESETS.map((p) => (
          <button key={p.id} type="button" className={styles.sheetChip} aria-pressed={preset === p.id}
            onClick={() => { setPreset(p.id); setRange(null); }}>
            {p.label}
          </button>
        ))}
        <button type="button" className={styles.sheetChip} aria-pressed={preset === null && range === null}
          onClick={() => { setPreset(null); setRange(null); }}>
          All time
        </button>
      </div>
      <div className={styles.sheetLabel}>Custom range</div>
      <div className={styles.rangeRow}>
        {(['from', 'to'] as const).map((which, i) => (
          <span key={which} style={{ display: 'contents' }}>
            {i === 1 && <span className={styles.rangeDash}>–</span>}
            <label className={`${styles.dateChip} ${range ? styles.dateChipActive : ''}`}>
              <CalendarIcon />
              <span>{formatChipDate(shown[which])}</span>
              <input className={styles.nativeOverlay} type="date" aria-label={which === 'from' ? 'From' : 'To'}
                value={shown[which]} onChange={(e) => setDate(which, e.target.value)} />
            </label>
          </span>
        ))}
      </div>
    </BottomSheet>
  );
}

interface Option { id: string; name: string; hidden: boolean; count: number }

export function OptionSheet({
  title, field, options, filter, countFor, onApply, onClose,
}: SheetProps & { title: string; field: 'typeIds' | 'groupIds'; options: readonly Option[] }) {
  const [picked, setPicked] = useState<readonly string[]>(filter[field]);
  const draft = { ...filter, [field]: picked };
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <BottomSheet
      title={title}
      onClose={onClose}
      headerAction={<ClearButton onClick={() => onApply({ ...filter, [field]: [] })} />}
      footer={<button type="button" className={styles.showButton} onClick={() => onApply(draft)}>{showLabel(countFor(draft))}</button>}
    >
      <div className={styles.options}>
        {options.map((o) => (
          <button key={o.id} type="button" className={styles.option} aria-pressed={picked.includes(o.id)} onClick={() => toggle(o.id)}>
            <span className={styles.check}>{picked.includes(o.id) && <CheckIcon size={14} />}</span>
            <span className={`${styles.optionName} ${o.hidden ? styles.optionHidden : ''}`}>{o.name}{o.hidden ? ' (hidden)' : ''}</span>
            <span className={styles.optionCount}>{o.count}</span>
          </button>
        ))}
      </div>
    </BottomSheet>
  );
}

export function ColourSheet({
  colors, filter, countFor, onApply, onClose,
}: Omit<SheetProps, 'today'> & { colors: readonly { id: string; name: string; hex: string }[] }) {
  const [picked, setPicked] = useState<readonly string[]>(filter.colorIds);
  const draft = { ...filter, colorIds: picked };
  return (
    <BottomSheet
      title="Colour"
      onClose={onClose}
      headerAction={<ClearButton onClick={() => onApply({ ...filter, colorIds: [] })} />}
      footer={<button type="button" className={styles.showButton} onClick={() => onApply(draft)}>{showLabel(countFor(draft))}</button>}
    >
      <div className={styles.swatches}>
        {colors.map((c) => {
          const on = picked.includes(c.id);
          return (
            <button key={c.id} type="button" className={styles.swatch} style={{ background: c.hex }} aria-label={c.name} aria-pressed={on}
              onClick={() => setPicked((p) => (on ? p.filter((x) => x !== c.id) : [...p, c.id]))}>
              {on && <CheckIcon />}
            </button>
          );
        })}
      </div>
    </BottomSheet>
  );
}
