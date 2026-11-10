import { describe, expect, it } from 'vitest';
import { evaluateExpression, formatCents, formatCsvAmount, formatPercent, toCents } from './money';

const cents = (s: string) => {
  const r = evaluateExpression(s);
  return r.ok ? r.cents : r.error;
};

describe('evaluateExpression', () => {
  it('parses plain amounts with comma or dot', () => {
    expect(cents('12,50')).toBe(1250);
    expect(cents('12.5')).toBe(1250);
    expect(cents('0')).toBe(0);
    expect(cents('5,')).toBe(500);
  });

  it('supports + - * / and parentheses', () => {
    expect(cents('12,50+8,20')).toBe(2070);
    expect(cents('3*4,5')).toBe(1350);
    expect(cents('(1+2)*3')).toBe(900);
    expect(cents('2+3*4')).toBe(1400);
    expect(cents('100/4-5')).toBe(2000);
  });

  it('accepts the keypad operators and whitespace', () => {
    expect(cents('3 × 4')).toBe(1200);
    expect(cents('9 ÷ 2')).toBe(450);
    expect(cents('€ 10')).toBe(1000);
  });

  it('allows negative results (refunds)', () => {
    expect(cents('-5+2')).toBe(-300);
    expect(cents('-12,34')).toBe(-1234);
    expect(cents('3-5')).toBe(-200);
  });

  it('rounds once at the end, half away from zero', () => {
    expect(cents('10/3')).toBe(333);
    expect(cents('20/3')).toBe(667);
    expect(cents('1.005')).toBe(101);
    expect(cents('-1.005')).toBe(-101);
    expect(cents('0,1+0,2')).toBe(30);
    expect(cents('0,001')).toBe(0);
  });

  it('reports errors', () => {
    expect(cents('')).toBe('empty');
    expect(cents('5+')).toBe('syntax');
    expect(cents('2*(3')).toBe('syntax');
    expect(cents('abc')).toBe('syntax');
    expect(cents('1,5,5')).toBe('syntax');
    expect(cents('1/0')).toBe('divide-by-zero');
    expect(cents('1/(2-2)')).toBe('divide-by-zero');
    expect(cents('9999999999999')).toBe('too-large');
  });
});

describe('formatting', () => {
  it('formats euros like the legacy app', () => {
    expect(formatCents(149276)).toBe('€1.492,76');
    expect(formatCents(0)).toBe('€0,00');
    expect(formatCents(5)).toBe('€0,05');
    expect(formatCents(-42404)).toBe('-€424,04');
    expect(formatCents(123456789)).toBe('€1.234.567,89');
    expect(formatCents(99999)).toBe('€999,99');
  });

  it('formats CSV amounts without grouping', () => {
    expect(formatCsvAmount(123450)).toBe('1234,50');
    expect(formatCsvAmount(-500)).toBe('-5,00');
  });

  it('formats percentages with at most one decimal', () => {
    expect(formatPercent(69.8)).toBe('69.8%');
    expect(formatPercent(50)).toBe('50%');
    expect(formatPercent(-12.34)).toBe('-12.3%');
  });

  it('converts to cents without float noise', () => {
    expect(toCents(0.29)).toBe(29);
    expect(toCents(-0)).toBe(0);
  });
});
