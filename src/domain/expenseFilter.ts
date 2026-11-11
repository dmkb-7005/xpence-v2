import { addMonthsToKey, daysInMonth, monthKeyOf, parseMonthKey, type IsoDate, type MonthKey } from './dates';

export type DatePreset = 'this-month' | 'last-month' | 'this-year' | 'last-12-months';
export const DATE_PRESETS: readonly { id: DatePreset; label: string }[] = [
  { id: 'this-month', label: 'This month' },
  { id: 'last-month', label: 'Last month' },
  { id: 'this-year', label: 'This year' },
  { id: 'last-12-months', label: 'Last 12 months' },
];

export interface DateRange {
  from: IsoDate;
  to: IsoDate;
}

const monthStart = (key: MonthKey) => `${key}-01`;
const monthEnd = (key: MonthKey) => {
  const { year, month } = parseMonthKey(key);
  return `${key}-${String(daysInMonth(year, month)).padStart(2, '0')}`;
};

/** Whole calendar months, so scheduled rows later in the month are included. */
export function presetRange(preset: DatePreset, today: IsoDate): DateRange {
  const month = monthKeyOf(today);
  switch (preset) {
    case 'this-month':
      return monthRange(month);
    case 'last-month':
      return monthRange(addMonthsToKey(month, -1));
    case 'this-year':
      return { from: `${today.slice(0, 4)}-01-01`, to: `${today.slice(0, 4)}-12-31` };
    case 'last-12-months':
      return { from: monthStart(addMonthsToKey(month, -11)), to: monthEnd(month) };
  }
}

export interface ExpenseFilter {
  query: string;
  preset: DatePreset | null;
  /** custom range, used when preset is null */
  range: DateRange | null;
  typeIds: readonly string[];
  groupIds: readonly string[];
  colorIds: readonly string[];
}

export const EMPTY_FILTER: ExpenseFilter = { query: '', preset: null, range: null, typeIds: [], groupIds: [], colorIds: [] };

/** The whole calendar month as a date range. */
export function monthRange(key: MonthKey): DateRange {
  return { from: monthStart(key), to: monthEnd(key) };
}

const MONTH_KEY = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * Link into the Expenses screen with preset filters:
 * `?range=this-month`, or `?month=2026-10` with optional `&type=<id>`.
 */
export function expensesLink(opts: { month: MonthKey; typeId?: string }): string {
  const params = new URLSearchParams({ month: opts.month });
  if (opts.typeId) params.set('type', opts.typeId);
  return `/expenses?${params.toString()}`;
}

/** The filter a link asks for, or null when the URL carries none (then the last view is restored). */
export function filterFromParams(params: URLSearchParams): ExpenseFilter | null {
  const range = params.get('range');
  if (range !== null && DATE_PRESETS.some((p) => p.id === range)) return { ...EMPTY_FILTER, preset: range as DatePreset };
  const month = params.get('month');
  if (month === null || !MONTH_KEY.test(month)) return null;
  const type = params.get('type');
  return { ...EMPTY_FILTER, range: monthRange(month), typeIds: type ? [type] : [] };
}

const dmShort = (iso: IsoDate) => `${iso.slice(8, 10)}-${iso.slice(5, 7)}`;

/** Date chip text for a custom range: `Oct 2026` for one whole month, otherwise `05-10 – 20-10`. */
export function rangeLabel(range: DateRange): string {
  const month = monthKeyOf(range.from);
  const whole = monthRange(month);
  if (range.from === whole.from && range.to === whole.to) return `${monthName(month).slice(0, 3)} ${month.slice(0, 4)}`;
  return `${dmShort(range.from)} – ${dmShort(range.to)}`;
}

export function activeRange(filter: ExpenseFilter, today: IsoDate): DateRange | null {
  return filter.preset ? presetRange(filter.preset, today) : filter.range;
}

/** Number of active filters, search excluded (shown as the badge on the filter button). */
export function activeFilterCount(filter: ExpenseFilter): number {
  return (
    (filter.preset || filter.range ? 1 : 0) +
    (filter.typeIds.length ? 1 : 0) +
    (filter.groupIds.length ? 1 : 0) +
    (filter.colorIds.length ? 1 : 0)
  );
}

/** Case- and accent-insensitive: "panaderia" finds "Panadería". */
export function normalizeText(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

interface Filterable {
  date: IsoDate;
  expenseTypeId: string;
  groupId: string | null;
  colorId: string | null;
  note: string;
}

export function makeMatcher(filter: ExpenseFilter, today: IsoDate): (e: Filterable) => boolean {
  const range = activeRange(filter, today);
  const query = normalizeText(filter.query);
  const types = new Set(filter.typeIds);
  const groups = new Set(filter.groupIds);
  const colors = new Set(filter.colorIds);
  return (e) =>
    (!range || (e.date >= range.from && e.date <= range.to)) &&
    (types.size === 0 || types.has(e.expenseTypeId)) &&
    (groups.size === 0 || (e.groupId !== null && groups.has(e.groupId))) &&
    (colors.size === 0 || (e.colorId !== null && colors.has(e.colorId))) &&
    (query === '' || normalizeText(e.note).includes(query));
}

export interface MonthGroup<T> {
  month: MonthKey;
  rows: T[];
  totalCents: number;
  /** every row in the month is after today */
  allScheduled: boolean;
}

/** Groups rows (already sorted newest first) by month. Totals cover all rows, not just rendered ones. */
export function groupByMonth<T extends { date: IsoDate; amountCents: number }>(rows: readonly T[], today: IsoDate): MonthGroup<T>[] {
  const groups: MonthGroup<T>[] = [];
  for (const row of rows) {
    const month = monthKeyOf(row.date);
    let group = groups.at(-1);
    if (!group || group.month !== month) {
      group = { month, rows: [], totalCents: 0, allScheduled: true };
      groups.push(group);
    }
    group.rows.push(row);
    group.totalCents += row.amountCents;
    if (row.date <= today) group.allScheduled = false;
  }
  return groups;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] as const;

export function monthName(key: MonthKey): string {
  return MONTHS[parseMonthKey(key).month - 1] ?? key;
}

/** `OCTOBER 2026` */
export function monthHeader(key: MonthKey): string {
  return `${monthName(key).toUpperCase()} ${key.slice(0, 4)}`;
}
