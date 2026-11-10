import { evaluateAmount, formatExpression, pressKey } from '../domain/keypad';
import { formatCents } from '../domain/money';
import styles from './AmountKeypad.module.css';

// [label, key]: three digit columns plus one operator column. The Android keyboard is never opened.
const KEYS: readonly (readonly [string, string])[] = [
  ['1', '1'], ['2', '2'], ['3', '3'], ['+', '+'],
  ['4', '4'], ['5', '5'], ['6', '6'], ['−', '-'],
  ['7', '7'], ['8', '8'], ['9', '9'], ['×', '*'],
  [',', ','], ['0', '0'], ['⌫', 'backspace'], ['÷', '/'],
];

interface Props {
  /** the expression text, e.g. `12,5+3*4` */
  value: string;
  onChange: (value: string) => void;
}

export function AmountKeypad({ value, onChange }: Props) {
  const result = evaluateAmount(value);
  const hasOperation = /(?<=[0-9,])[+\-*/]/.test(value);

  return (
    <div className={styles.keypad}>
      <div className={styles.displayRow}>
        <div className={styles.display} aria-live="polite" aria-label="Amount">
          <span className={value === '' ? styles.placeholder : undefined}>
            €{value === '' ? '0,00' : formatExpression(value)}
          </span>
          {hasOperation && result.ok && <span className={styles.result}>= {formatCents(result.cents)}</span>}
        </div>
        <button type="button" className={styles.clear} aria-label="Clear amount" onClick={() => onChange('')}>
          ✕
        </button>
      </div>
      <div className={styles.grid}>
        {KEYS.map(([label, key]) => (
          <button
            key={key}
            type="button"
            className={`${styles.key} ${'+-*/'.includes(key) ? styles.operator : ''}`}
            aria-label={key === 'backspace' ? 'Delete last character' : undefined}
            onClick={() => onChange(pressKey(value, key))}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
