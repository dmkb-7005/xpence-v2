import { evaluateExpression, formatCents, type ParseResult } from './money';

const OPERATORS = '+-*/';
const MAX_LENGTH = 40;
const isOperator = (c: string) => c !== '' && OPERATORS.includes(c);

/** The number currently being typed: everything after the last operator. */
function currentToken(expr: string): string {
  return /[0-9,]*$/.exec(expr)?.[0] ?? '';
}

/**
 * Applies one keypad key to the expression text. Keys: `0-9`, `,`, `+ - * /`, `backspace`, `clear`.
 * The keypad keeps the text valid-looking: one comma per number, at most two decimals,
 * no leading zeros, and an operator replaces a previous operator.
 */
export function pressKey(expr: string, key: string): string {
  if (key === 'clear') return '';
  if (key === 'backspace') return expr.slice(0, -1);

  if (/^[0-9]$/.test(key)) {
    if (expr.length >= MAX_LENGTH) return expr;
    const token = currentToken(expr);
    const decimals = token.includes(',') ? (token.split(',')[1] ?? '').length : null;
    if (decimals !== null && decimals >= 2) return expr;
    if (token === '0') return expr.slice(0, -1) + key;
    return expr + key;
  }

  if (key === ',') {
    if (expr.length >= MAX_LENGTH) return expr;
    const token = currentToken(expr);
    if (token.includes(',')) return expr;
    return token === '' ? `${expr}0,` : `${expr},`;
  }

  if (isOperator(key)) {
    if (expr === '') return key === '-' ? '-' : expr;
    if (expr === '-') return expr;
    if (isOperator(expr.slice(-1))) return expr.slice(0, -1) + key;
    if (expr.length >= MAX_LENGTH) return expr;
    return expr + key;
  }

  return expr;
}

/** Evaluates the expression, ignoring a trailing operator (`5+` counts as `5`). */
export function evaluateAmount(expr: string): ParseResult {
  return evaluateExpression(expr.replace(/[+\-*/]+$/, ''));
}

/** Display text: spaces around operators and `×` `÷` for `*` `/`. */
export function formatExpression(expr: string): string {
  return expr
    .replace(/(?<=[0-9,])([+\-*/])/g, ' $1 ')
    .replace(/\*/g, '×')
    .replace(/\//g, '÷')
    .trimEnd();
}

export type AmountView =
  | { state: 'empty'; big: string; line: null }
  | { state: 'value'; big: string; line: string | null; negative: boolean }
  | { state: 'error'; message: string; line: string };

const OPERATION = /(?<=[0-9,])[+\-*/]/;

/**
 * What the amount card shows. With an operation: the expression on the small line and the result big.
 * Without one: the number as typed, big (`€12,5`, `-€25`), so typing feels direct.
 */
export function amountView(expr: string): AmountView {
  if (expr === '' || expr === '-') return { state: 'empty', big: expr === '-' ? '-€' : '€0,00', line: null };
  const hasOperation = OPERATION.test(expr);
  const result = evaluateAmount(expr);
  if (!result.ok && result.error === 'divide-by-zero') {
    return { state: 'error', message: 'Cannot divide by zero', line: formatExpression(expr) };
  }
  if (!result.ok) {
    return { state: 'error', message: 'Check the calculation', line: formatExpression(expr) };
  }
  if (hasOperation) {
    return { state: 'value', big: formatCents(result.cents), line: formatExpression(expr), negative: result.cents < 0 };
  }
  const negative = expr.startsWith('-');
  const digits = negative ? expr.slice(1) : expr;
  const grouped = digits.replace(/^(\d+)/, (m) => m.replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
  return { state: 'value', big: `${negative ? '-' : ''}€${grouped}`, line: null, negative: result.cents < 0 };
}
