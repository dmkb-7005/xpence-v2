import { addMonthsToKey, dayOfMonth, monthKeyOf, type IsoDate, type MonthKey } from './dates';
import { computePace, computeUsual, firstMonthOf, totalsByMonth, type UsualRange } from './usual';

/** Colour of one month in a type's bar. */
export type MonthTone = 'below' | 'usual' | 'above' | 'wayAbove' | 'none';
export type MonthKind = 'past' | 'current' | 'future';

export const TONE_COLOR: Record<MonthTone, string> = {
  below: '#4FBF92',
  usual: '#3D9BFF',
  above: '#D4A85A',
  wayAbove: '#FF8A90',
  none: '#4A5468',
};

/**
 * - future months: no data yet
 * - above: over the upper bound (75th percentile); way above: more than twice the upper spread over the median
 * - below (complete months only): more than twice the lower spread under the median
 * - a month in progress only turns amber or red once it is already over
 */
export function toneFor(value: number, usual: UsualRange | null, kind: MonthKind): MonthTone {
  if (kind === 'future') return 'none';
  if (!usual) return 'usual';
  if (value > usual.median + 2 * (usual.upper - usual.median)) return 'wayAbove';
  if (value > usual.upper) return 'above';
  if (kind === 'past' && value < usual.median - 2 * (usual.median - usual.lower)) return 'below';
  return 'usual';
}

export interface BudgetCell {
  month: MonthKey;
  kind: MonthKind;
  valueCents: number;
  tone: MonthTone;
}

export interface BudgetRow {
  typeId: string;
  name: string;
  /** usual median for the focal month, null without enough history */
  usualCents: number | null;
  cells: [BudgetCell, BudgetCell, BudgetCell];
}

export interface BudgetTotal extends BudgetRow {
  /** per column: difference to usual (past) or to the usual spend by today (current); null for future */
  deltas: [number | null, number | null, number | null];
  /** day of month the current-month delta refers to */
  day: number;
}

export interface BudgetView {
  months: [MonthKey, MonthKey, MonthKey];
  hasHistory: boolean;
  total: BudgetTotal;
  rows: BudgetRow[];
}

interface Item {
  date: IsoDate;
  amountCents: number;
  expenseTypeId: string;
}

export function budgetView(
  items: readonly Item[],
  types: readonly { id: string; name: string }[],
  focal: MonthKey,
  today: IsoDate,
  size: number,
): BudgetView {
  const months: [MonthKey, MonthKey, MonthKey] = [addMonthsToKey(focal, -1), focal, addMonthsToKey(focal, 1)];
  const current = monthKeyOf(today);
  const kinds = months.map((m) => (m < current ? 'past' : m === current ? 'current' : 'future')) as MonthKind[];
  const first = firstMonthOf(items);

  const buildRow = (typeId: string, name: string, totals: ReadonlyMap<MonthKey, number>): BudgetRow => {
    const cells = months.map((month, i) => {
      const valueCents = totals.get(month) ?? 0;
      return { month, kind: kinds[i]!, valueCents, tone: toneFor(valueCents, computeUsual(totals, first, month, size), kinds[i]!) };
    }) as BudgetRow['cells'];
    return { typeId, name, usualCents: computeUsual(totals, first, focal, size)?.median ?? null, cells };
  };

  const allTotals = totalsByMonth(items);
  const totalRow = buildRow('total', 'Total', allTotals);
  const pace = computePace(items, today, size);
  const deltas = totalRow.cells.map((cell) => {
    if (cell.kind === 'future') return null;
    if (cell.kind === 'current') return pace.usualToDate === null ? null : cell.valueCents - pace.usualToDate;
    const usual = computeUsual(allTotals, first, cell.month, size);
    return usual ? cell.valueCents - usual.median : null;
  }) as BudgetTotal['deltas'];

  const byType = new Map<string, Item[]>();
  for (const item of items) {
    const list = byType.get(item.expenseTypeId);
    if (list) list.push(item);
    else byType.set(item.expenseTypeId, [item]);
  }

  const rows = types
    .map((t) => buildRow(t.id, t.name, totalsByMonth(byType.get(t.id) ?? [])))
    // a type shows when it has spending in the three months or a usual value above zero
    .filter((r) => r.cells.some((c) => c.valueCents !== 0) || (r.usualCents ?? 0) > 0)
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));

  return {
    months,
    hasHistory: totalRow.usualCents !== null,
    total: { ...totalRow, deltas, day: dayOfMonth(today) },
    rows,
  };
}

/** Bar background: the three month colours at 12 %, 50 % and 88 %. */
export function barGradient(tones: readonly MonthTone[]): string {
  const [a, b, c] = tones.map((t) => TONE_COLOR[t]);
  return `linear-gradient(90deg, ${a} 0%, ${a} 12%, ${b} 50%, ${c} 88%, ${c} 100%)`;
}
