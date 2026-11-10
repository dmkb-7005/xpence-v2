import { describe, expect, it } from 'vitest';
import { amountView, evaluateAmount, formatExpression, pressKey } from './keypad';

const type = (...keys: string[]) => keys.reduce((expr, key) => pressKey(expr, key), '');

describe('pressKey', () => {
  it('builds numbers with a decimal comma', () => {
    expect(type('1', '2', ',', '5')).toBe('12,5');
    expect(type(',')).toBe('0,');
    expect(type('5', ',', ',')).toBe('5,');
  });

  it('allows at most two decimals', () => {
    expect(type('1', ',', '2', '5', '3')).toBe('1,25');
  });

  it('does not build leading zeros', () => {
    expect(type('0', '5')).toBe('5');
    expect(type('5', '+', '0', '7')).toBe('5+7');
    expect(type('0', ',', '5')).toBe('0,5');
    expect(type('1', '0', '5')).toBe('105');
  });

  it('takes operators only after a number, except a leading minus', () => {
    expect(type('+')).toBe('');
    expect(type('*')).toBe('');
    expect(type('-')).toBe('-');
    expect(type('-', '5')).toBe('-5');
    expect(type('-', '+')).toBe('-');
    expect(type('5', '+', '3')).toBe('5+3');
  });

  it('replaces a trailing operator with the new one', () => {
    expect(type('5', '*', '+')).toBe('5+');
    expect(type('5', '+', '-')).toBe('5-');
  });

  it('starts a number with 0, after an operator', () => {
    expect(type('5', '+', ',', '5')).toBe('5+0,5');
  });

  it('deletes and clears', () => {
    expect(pressKey('12,5', 'backspace')).toBe('12,');
    expect(pressKey('', 'backspace')).toBe('');
    expect(pressKey('5+3', 'clear')).toBe('');
  });

  it('stops at the length limit', () => {
    const long = '1'.repeat(40);
    expect(pressKey(long, '2')).toBe(long);
  });
});

describe('evaluateAmount', () => {
  it('ignores a trailing operator', () => {
    const r = evaluateAmount('5+');
    expect(r.ok && r.cents).toBe(500);
  });

  it('evaluates keypad expressions', () => {
    const r = evaluateAmount('12,5*2');
    expect(r.ok && r.cents).toBe(2500);
  });

  it('is empty for nothing or a lone minus', () => {
    expect(evaluateAmount('')).toEqual({ ok: false, error: 'empty' });
    expect(evaluateAmount('-')).toEqual({ ok: false, error: 'empty' });
  });
});

describe('formatExpression', () => {
  it('spaces operators and uses × ÷', () => {
    expect(formatExpression('12,5+3*4/2')).toBe('12,5 + 3 × 4 ÷ 2');
    expect(formatExpression('-5')).toBe('-5');
    expect(formatExpression('5-')).toBe('5 -');
  });
});

describe('amountView', () => {
  it('shows €0,00 when empty', () => {
    expect(amountView('')).toEqual({ state: 'empty', big: '€0,00', line: null });
  });

  it('shows a plain number as typed, with thousands separators', () => {
    expect(amountView('12,5')).toEqual({ state: 'value', big: '€12,5', line: null, negative: false });
    expect(amountView('1250')).toEqual({ state: 'value', big: '€1.250', line: null, negative: false });
    expect(amountView('-25')).toEqual({ state: 'value', big: '-€25', line: null, negative: true });
  });

  it('shows the expression small and the result big', () => {
    expect(amountView('12,5+8,2')).toEqual({ state: 'value', big: '€20,70', line: '12,5 + 8,2', negative: false });
    expect(amountView('5-')).toEqual({ state: 'value', big: '€5,00', line: '5 -', negative: false });
  });

  it('reports division by zero', () => {
    expect(amountView('20,7/0')).toEqual({ state: 'error', message: 'Cannot divide by zero', line: '20,7 ÷ 0' });
  });
});
