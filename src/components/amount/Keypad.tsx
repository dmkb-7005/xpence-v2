import { useRef } from 'react';
import { pressKey } from '../../domain/keypad';
import { BackspaceIcon } from '../icons';
import styles from './Amount.module.css';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

const HOLD_TO_CLEAR_MS = 500;

// Row by row: operator column on the left, digits in phone order (1-2-3 on top, 7-8-9 at the bottom).
const ROWS: readonly (readonly [string, string, string?])[] = [
  ['÷', '/', 'Divide'], ['1', '1'], ['2', '2'], ['3', '3'],
  ['×', '*', 'Multiply'], ['4', '4'], ['5', '5'], ['6', '6'],
  ['−', '-', 'Minus'], ['7', '7'], ['8', '8'], ['9', '9'],
  ['+', '+', 'Plus'], [',', ',', 'Decimal comma'], ['0', '0'],
];

/** Custom keypad; the Android keyboard never opens for the amount. Hold backspace to clear. */
export function Keypad({ value, onChange }: Props) {
  const holdTimer = useRef<number | null>(null);
  const cleared = useRef(false);
  // keep the latest value for the long-press timer
  const latest = useRef(value);
  latest.current = value;

  const press = (key: string) => onChange(pressKey(latest.current, key));

  const startHold = () => {
    cleared.current = false;
    holdTimer.current = window.setTimeout(() => {
      cleared.current = true;
      navigator.vibrate?.(20);
      onChange('');
    }, HOLD_TO_CLEAR_MS);
  };
  const endHold = () => {
    if (holdTimer.current !== null) window.clearTimeout(holdTimer.current);
    holdTimer.current = null;
  };

  return (
    <div className={styles.keypad} role="group" aria-label="Amount keypad">
      {ROWS.map(([label, key, aria]) => (
        <button
          key={key}
          type="button"
          className={`${styles.key} ${'+-*/'.includes(key) ? styles.keyOp : ''}`}
          aria-label={aria}
          onClick={() => press(key)}
        >
          {label}
        </button>
      ))}
      <button
        type="button"
        className={`${styles.key} ${styles.keyBack}`}
        aria-label="Backspace, hold to clear"
        onPointerDown={startHold}
        onPointerUp={endHold}
        onPointerLeave={endHold}
        onPointerCancel={endHold}
        onContextMenu={(e) => e.preventDefault()}
        onClick={() => {
          if (cleared.current) cleared.current = false;
          else press('backspace');
        }}
      >
        <BackspaceIcon />
      </button>
    </div>
  );
}
