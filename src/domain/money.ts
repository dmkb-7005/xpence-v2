export type ParseError = 'empty' | 'syntax' | 'divide-by-zero' | 'too-large';
export type ParseResult = { ok: true; cents: number } | { ok: false; error: ParseError };

const MAX_CENTS = 100_000_000_000; // 1 billion euros

class ParseFailure extends Error {
  constructor(readonly code: ParseError) {
    super(code);
  }
}

/** Final value to integer cents: half away from zero, tolerant of float noise (1.005 -> 101). */
export function toCents(value: number): number {
  const rounded = Math.round(Number((Math.abs(value) * 100).toPrecision(12)));
  const cents = value < 0 ? -rounded : rounded;
  return cents === 0 ? 0 : cents;
}

/**
 * Evaluates an amount expression: numbers with `,` or `.` as decimal separator,
 * `+ - * /` (also `×` `÷`), unary minus and parentheses. The result is rounded to cents once, at the end.
 */
export function evaluateExpression(input: string): ParseResult {
  const text = input.replace(/\s+/g, '').replace(/€/g, '').replace(/×/g, '*').replace(/÷/g, '/');
  if (text === '') return { ok: false, error: 'empty' };

  let pos = 0;
  const fail = (code: ParseError): never => {
    throw new ParseFailure(code);
  };

  function parseExpression(): number {
    let value = parseTerm();
    while (text[pos] === '+' || text[pos] === '-') {
      const op = text[pos++];
      const right = parseTerm();
      value = op === '+' ? value + right : value - right;
    }
    return value;
  }

  function parseTerm(): number {
    let value = parseFactor();
    while (text[pos] === '*' || text[pos] === '/') {
      const op = text[pos++];
      const right = parseFactor();
      if (op === '*') {
        value *= right;
      } else {
        if (right === 0) fail('divide-by-zero');
        value /= right;
      }
    }
    return value;
  }

  function parseFactor(): number {
    const c = text[pos];
    if (c === '-') {
      pos++;
      return -parseFactor();
    }
    if (c === '+') {
      pos++;
      return parseFactor();
    }
    if (c === '(') {
      pos++;
      const value = parseExpression();
      if (text[pos] !== ')') fail('syntax');
      pos++;
      return value;
    }
    const m = /^(\d+([.,]\d*)?|[.,]\d+)/.exec(text.slice(pos));
    if (!m) return fail('syntax');
    pos += m[0].length;
    return Number(m[0].replace(',', '.'));
  }

  try {
    const value = parseExpression();
    if (pos !== text.length) fail('syntax');
    if (!Number.isFinite(value)) fail('too-large');
    const cents = toCents(value);
    if (Math.abs(cents) > MAX_CENTS) fail('too-large');
    return { ok: true, cents };
  } catch (e) {
    if (e instanceof ParseFailure) return { ok: false, error: e.code };
    throw e;
  }
}

/** `€1.492,76`, negatives `-€424,04` (legacy look; Intl es-ES would drop the separator for 4 digits). */
export function formatCents(cents: number): string {
  const abs = Math.abs(Math.round(cents));
  const euros = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const rest = String(abs % 100).padStart(2, '0');
  return `${cents < 0 ? '-' : ''}€${euros},${rest}`;
}

/** Plain decimal-comma amount for CSV: `1234,50`, `-5,00`. */
export function formatCsvAmount(cents: number): string {
  const abs = Math.abs(Math.round(cents));
  return `${cents < 0 ? '-' : ''}${Math.floor(abs / 100)},${String(abs % 100).padStart(2, '0')}`;
}

/** `69.8%`, `50%` (one decimal, trailing `.0` dropped). */
export function formatPercent(value: number): string {
  return `${Number(value.toFixed(1))}%`;
}
