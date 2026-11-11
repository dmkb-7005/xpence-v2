import { activeRange, normalizeText, type DatePreset, type DateRange } from './expenseFilter';
import { monthKeyOf, type IsoDate, type MonthKey } from './dates';
import { summarizeYears, type YearSummary } from './savings';

export type IncomeKind = 'regular' | 'dividend' | 'stockSale';
export const INCOME_KINDS: readonly { id: IncomeKind; label: string; plural: string }[] = [
  { id: 'regular', label: 'Regular', plural: 'regular incomes' },
  { id: 'dividend', label: 'Dividend', plural: 'dividends' },
  { id: 'stockSale', label: 'Stock sale', plural: 'stock sales' },
];

interface Flags { isDividend: boolean; isStockSale: boolean }

export function kindOf(income: Flags): IncomeKind {
  return income.isDividend ? 'dividend' : income.isStockSale ? 'stockSale' : 'regular';
}

export function flagsFor(kind: IncomeKind): Flags {
  return { isDividend: kind === 'dividend', isStockSale: kind === 'stockSale' };
}

export interface IncomeFilter {
  query: string;
  kind: IncomeKind | 'all';
  preset: DatePreset | null;
  range: DateRange | null;
}

export const EMPTY_INCOME_FILTER: IncomeFilter = { query: '', kind: 'all', preset: null, range: null };

export function isIncomeFilterActive(f: IncomeFilter): boolean {
  return f.query.trim() !== '' || f.kind !== 'all' || f.preset !== null || f.range !== null;
}

export function makeIncomeMatcher(filter: IncomeFilter, today: IsoDate) {
  const range = activeRange({ query: '', typeIds: [], groupIds: [], colorIds: [], preset: filter.preset, range: filter.range }, today);
  const query = normalizeText(filter.query);
  return (i: Flags & { date: IsoDate; note: string }) =>
    (!range || (i.date >= range.from && i.date <= range.to)) &&
    (filter.kind === 'all' || kindOf(i) === filter.kind) &&
    (query === '' || normalizeText(i.note).includes(query));
}

/** "12 dividends", "1 stock sale", "5 entries" */
export function countLabel(n: number, kind: IncomeFilter['kind']): string {
  const k = INCOME_KINDS.find((x) => x.id === kind);
  const many = k ? k.plural : 'entries';
  const one = k ? (k.id === 'regular' ? 'regular income' : k.label.toLowerCase()) : 'entry';
  return `${n.toLocaleString('de-DE')} ${n === 1 ? one : many}`;
}

/**
 * Overview years up to and including the current month: months after it (scheduled
 * repeats only) are left out of the list and of the year totals.
 */
export function overviewYears(
  incomes: readonly { date: IsoDate; amountCents: number }[],
  expenses: readonly { date: IsoDate; amountCents: number }[],
  today: IsoDate,
): (YearSummary & { toDate: boolean })[] {
  const current: MonthKey = monthKeyOf(today);
  const upTo = <T extends { date: IsoDate }>(rows: readonly T[]) => rows.filter((r) => monthKeyOf(r.date) <= current);
  return summarizeYears(upTo(incomes), upTo(expenses)).map((y) => ({ ...y, toDate: String(y.year) === today.slice(0, 4) }));
}
