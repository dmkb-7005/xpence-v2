import { formatCsvAmount } from '../domain/money';
import type { Backup } from './schema';

type Cell = string | number | boolean | null;
interface Column<T> {
  header: string;
  value: (row: T) => Cell;
}

export function csvEscape(value: string): string {
  return /[;"\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function cell(value: Cell): string {
  if (value === null) return '';
  return csvEscape(typeof value === 'string' ? value : String(value));
}

/** UTF-8 with BOM, `;` separators and CRLF line endings, so European Excel opens it directly. */
export function toCsv<T>(columns: readonly Column<T>[], rows: readonly T[]): string {
  const lines = [
    columns.map((c) => csvEscape(c.header)).join(';'),
    ...rows.map((row) => columns.map((c) => cell(c.value(row))).join(';')),
  ];
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

export type CsvTable = 'expenseTypes' | 'groups' | 'colors' | 'expenses' | 'incomes';
export const CSV_TABLES: readonly CsvTable[] = ['expenseTypes', 'groups', 'colors', 'expenses', 'incomes'];

/** One CSV per table. Expenses also carry the type, group and color names for readability in Excel. */
export function tableToCsv(backup: Backup, table: CsvTable): string {
  const nameOf = (rows: readonly { id: string; name: string }[]) => new Map(rows.map((r) => [r.id, r.name]));
  switch (table) {
    case 'expenseTypes':
    case 'groups':
      return toCsv<{ id: string; name: string; hidden: boolean; createdAt: string }>(
        [
          { header: 'id', value: (r) => r.id },
          { header: 'name', value: (r) => r.name },
          { header: 'hidden', value: (r) => r.hidden },
          { header: 'createdAt', value: (r) => r.createdAt },
        ],
        backup[table],
      );
    case 'colors':
      return toCsv<Backup['colors'][number]>(
        [
          { header: 'id', value: (r) => r.id },
          { header: 'name', value: (r) => r.name },
          { header: 'hex', value: (r) => r.hex },
          { header: 'sortOrder', value: (r) => r.sortOrder },
          { header: 'hidden', value: (r) => r.hidden },
        ],
        backup.colors,
      );
    case 'expenses': {
      const types = nameOf(backup.expenseTypes);
      const groups = nameOf(backup.groups);
      const colors = nameOf(backup.colors);
      return toCsv<Backup['expenses'][number]>(
        [
          { header: 'id', value: (r) => r.id },
          { header: 'date', value: (r) => r.date },
          { header: 'amount', value: (r) => formatCsvAmount(r.amountCents) },
          { header: 'expenseTypeId', value: (r) => r.expenseTypeId },
          { header: 'expenseType', value: (r) => types.get(r.expenseTypeId) ?? '' },
          { header: 'groupId', value: (r) => r.groupId },
          { header: 'group', value: (r) => (r.groupId === null ? '' : (groups.get(r.groupId) ?? '')) },
          { header: 'colorId', value: (r) => r.colorId },
          { header: 'color', value: (r) => (r.colorId === null ? '' : (colors.get(r.colorId) ?? '')) },
          { header: 'note', value: (r) => r.note },
          { header: 'seriesId', value: (r) => r.seriesId },
          { header: 'createdAt', value: (r) => r.createdAt },
          { header: 'updatedAt', value: (r) => r.updatedAt },
        ],
        backup.expenses,
      );
    }
    case 'incomes':
      return toCsv<Backup['incomes'][number]>(
        [
          { header: 'id', value: (r) => r.id },
          { header: 'date', value: (r) => r.date },
          { header: 'amount', value: (r) => formatCsvAmount(r.amountCents) },
          { header: 'note', value: (r) => r.note },
          { header: 'isDividend', value: (r) => r.isDividend },
          { header: 'isStockSale', value: (r) => r.isStockSale },
          { header: 'createdAt', value: (r) => r.createdAt },
          { header: 'updatedAt', value: (r) => r.updatedAt },
        ],
        backup.incomes,
      );
  }
}
