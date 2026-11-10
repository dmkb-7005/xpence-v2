import { evaluateExpression, type ParseResult } from './money';

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
