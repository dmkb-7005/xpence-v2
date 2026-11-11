import { dayOfMonth, monthKeyOf, type IsoDate, type MonthKey } from './dates';
import { median } from './stats';
import { firstMonthOf, windowFor } from './usual';

interface Item {
  date: IsoDate;
  amountCents: number;
  expenseTypeId: string;
}

export interface Driver {
  typeId: string;
  /** spend of this type dated up to today */
  spentCents: number;
  /** the type's usual spend by this day of the month (median over the window) */
  usualCents: number;
  /** spentCents − usualCents, always > 0 */
  overCents: number;
}

/**
 * The expense types furthest above their own usual so far this month — what pushes the month over.
 * Compares like with like: this month up to today against the window months up to the same day.
 * Returns [] without a full window of history.
 */
export function monthDrivers(items: readonly Item[], today: IsoDate, size: number, limit = 3): Driver[] {
  const focal = monthKeyOf(today);
  const day = dayOfMonth(today);
  const window = windowFor(focal, size, firstMonthOf(items));
  if (window.length < size) return [];
  const windowIndex = new Map<MonthKey, number>(window.map((m, i) => [m, i]));

  const spent = new Map<string, number>();
  /** per type: cumulative spend up to `day` in each window month */
  const past = new Map<string, number[]>();
  for (const item of items) {
    if (dayOfMonth(item.date) > day) continue;
    const month = monthKeyOf(item.date);
    if (month === focal) {
      if (item.date <= today) spent.set(item.expenseTypeId, (spent.get(item.expenseTypeId) ?? 0) + item.amountCents);
      continue;
    }
    const i = windowIndex.get(month);
    if (i === undefined) continue;
    let sums = past.get(item.expenseTypeId);
    if (!sums) past.set(item.expenseTypeId, (sums = new Array<number>(size).fill(0)));
    sums[i] = (sums[i] ?? 0) + item.amountCents;
  }

  const drivers: Driver[] = [];
  for (const [typeId, spentCents] of spent) {
    const sums = past.get(typeId);
    const usualCents = sums ? Math.round(median(sums)) : 0;
    const overCents = spentCents - usualCents;
    if (overCents > 0) drivers.push({ typeId, spentCents, usualCents, overCents });
  }
  return drivers.sort((a, b) => b.overCents - a.overCents || a.typeId.localeCompare(b.typeId)).slice(0, limit);
}
