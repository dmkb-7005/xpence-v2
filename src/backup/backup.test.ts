import { describe, expect, it } from 'vitest';
import { tableToCsv } from './csv';
import { sampleBackup } from './fixture';
import { parseBackup } from './schema';

const clone = () => JSON.parse(JSON.stringify(sampleBackup));

describe('parseBackup', () => {
  it('accepts a valid backup, also after a JSON round trip', () => {
    const result = parseBackup(clone());
    expect(result.ok).toBe(true);
    expect(result.ok && result.backup).toEqual(sampleBackup);
  });

  it('rejects something that is not a backup', () => {
    expect(parseBackup(null).ok).toBe(false);
    expect(parseBackup({ foo: 1 }).ok).toBe(false);
    expect(parseBackup([]).ok).toBe(false);
  });

  it('rejects an unknown schema version with a clear message', () => {
    const raw = clone();
    raw.schemaVersion = 2;
    const result = parseBackup(raw);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors[0]).toBe('Unsupported schemaVersion 2 (this app reads 1).');
  });

  it('rejects references to missing types, groups and colors', () => {
    const raw = clone();
    raw.expenses[0].expenseTypeId = '99';
    raw.expenses[1].groupId = '98';
    raw.expenses[1].colorId = '97';
    const result = parseBackup(raw);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors.length).toBe(3);
  });

  it('rejects duplicate ids, bad dates, fractional cents and a double-flagged income', () => {
    const dup = clone();
    dup.expenses[1].id = '10';
    expect(parseBackup(dup).ok).toBe(false);

    const date = clone();
    date.expenses[0].date = '2026-02-30';
    expect(parseBackup(date).ok).toBe(false);

    const frac = clone();
    frac.expenses[0].amountCents = 10.5;
    expect(parseBackup(frac).ok).toBe(false);

    const both = clone();
    both.incomes[0].isDividend = true;
    both.incomes[0].isStockSale = true;
    expect(parseBackup(both).ok).toBe(false);
  });

  it('rejects settings outside the allowed values', () => {
    const raw = clone();
    raw.settings.usualWindowMonths = 5;
    expect(parseBackup(raw).ok).toBe(false);
  });
});

describe('tableToCsv', () => {
  it('starts with a BOM, uses ; separators and CRLF', () => {
    const csv = tableToCsv(sampleBackup, 'expenseTypes');
    expect(csv).toBe('\uFEFFid;name;hidden;createdAt\r\n1;Alimentos;false;2020-09-21T20:49:43.187Z\r\n7;Otros;true;2020-09-21T20:55:15.237Z\r\n');
  });

  it('writes decimal-comma amounts, resolves names and quotes special characters', () => {
    const lines = tableToCsv(sampleBackup, 'expenses').replace(/^\uFEFF/, '').split('\r\n');
    expect(lines[0]).toBe('id;date;amount;expenseTypeId;expenseType;groupId;group;colorId;color;note;seriesId;createdAt;updatedAt');
    expect(lines[1]).toBe('10;2026-10-31;42,22;1;Alimentos;;;;;;;2026-11-02T20:20:00Z;2026-11-02T20:20:00Z');
    expect(lines[2]).toBe(
      '11;2026-11-14;14,99;7;Otros;3;Vacaciones;2;Amarillo;"Netflix; ""family"" plan\nsecond line";series-1;2026-08-24T19:51:00Z;2026-08-24T19:51:00Z',
    );
    expect(lines[3]?.startsWith('12;2026-11-20;-25,00;')).toBe(true);
  });

  it('exports incomes with their flags', () => {
    const lines = tableToCsv(sampleBackup, 'incomes').replace(/^\uFEFF/, '').split('\r\n');
    expect(lines[0]).toBe('id;date;amount;note;isDividend;isStockSale;createdAt;updatedAt');
    expect(lines[2]?.startsWith('2;2026-02-10;12,34;;true;false;')).toBe(true);
  });
});
