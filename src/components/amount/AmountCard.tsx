import type { ReactNode } from 'react';
import { amountView } from '../../domain/keypad';
import { AlertIcon, ChevronDown, ChevronUp, ClockIcon, RefundIcon } from '../icons';
import styles from './Amount.module.css';

interface Props {
  /** expression text, e.g. `12,5+8,2` */
  expr: string;
  keypadOpen: boolean;
  onToggle: () => void;
  /** the row is dated in the future */
  scheduled?: boolean;
}

/** Colours the operators of a formatted expression. */
function Expression({ text }: { text: string }) {
  const parts = text.split(/( [+\-×÷] ?)/).filter((p) => p !== '');
  return (
    <span className={styles.expr}>
      <bdi>
        {parts.map((p, i) =>
          /^ [+\-×÷] ?$/.test(p) ? <span key={i} className={styles.op}>{p.replace('-', '−')}</span> : <span key={i}>{p}</span>,
        )}
      </bdi>
    </span>
  );
}

/** The big amount at the top of the form. Tapping it shows or hides the keypad. */
export function AmountCard({ expr, keypadOpen, onToggle, scheduled = false }: Props) {
  const view = amountView(expr);
  const isError = view.state === 'error';
  const negative = view.state === 'value' && view.negative;

  let badge: ReactNode = null;
  if (negative) {
    badge = <span className={`${styles.badge} ${styles.badgeRefund}`}><RefundIcon />Refund</span>;
  } else if (scheduled) {
    badge = <span className={`${styles.badge} ${styles.badgeScheduled}`}><ClockIcon />Scheduled</span>;
  }

  const toggle = keypadOpen ? (
    <span className={styles.toggle}><ChevronUp /></span>
  ) : (
    <span className={styles.toggle}><ChevronDown />Tap to edit</span>
  );

  let big: ReactNode;
  if (view.state === 'error') {
    big = <div className={styles.error}><AlertIcon />{view.message}</div>;
  } else {
    const cls = [
      styles.big,
      view.state === 'empty' ? styles.placeholder : '',
      negative ? styles.positive : '',
      scheduled && !negative ? styles.scheduledAmount : '',
    ].join(' ');
    big = <div className={cls} data-long={view.big.length > 11}>{view.big}</div>;
  }

  const label = view.state === 'error' ? view.message : view.state === 'empty' ? 'no amount' : view.big;

  return (
    <button
      type="button"
      className={styles.card}
      data-open={keypadOpen && !isError}
      data-error={isError}
      data-dashed={scheduled && !keypadOpen && !isError}
      aria-label={`Amount ${label}, tap to ${keypadOpen ? 'hide' : 'show'} keypad`}
      aria-expanded={keypadOpen}
      onClick={onToggle}
    >
      <div className={styles.top}>
        {toggle}
        {badge ?? (view.line !== null ? <Expression text={view.line} /> : null)}
      </div>
      {big}
    </button>
  );
}
