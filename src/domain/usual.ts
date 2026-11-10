import { addMonthsToKey, dayOfMonth, monthKeyOf, type IsoDate, type MonthKey } from './dates';
import { median, percentile } from './stats';

export interface Dated {
  date: IsoDate;
  amountCents: number;
}

/** Months of history used for the usual range (setting `usualWindowMonths`). */
export type UsualWindow = 3 | 6 | 12;
/** Fewer complete months than this and every comparison is hidden. */
export const MIN_USUAL_MONTHS = 3;

export interface UsualRange {
  /** the complete months the range is based on, oldest first */
  months: MonthKey[];
  median: number;
  /** 25th percentile of the monthly totals */
  lower: number;
  /** 75th percentile of the monthly totals */
  upper: number;
}

export type PaceState = 'onTrack' | 'trendingOver' | 'over';

export interface Pace {
  /** spend dated up to and including today */
  spentToDate: number;
  /** spend already entered with a date after today, within this month */
  scheduled: number;
  usual: UsualRange | null;
  usualToDate: number | null;
  expectedRemaining: number | null;
  projected: number | null;
  state: PaceState | null;
  /** on track and projected below the usual median */
  betterThanUsual: boolean;
}

export function totalsByMonth(items: readonly Dated[]): Map<MonthKey, number> {
  const totals = new Map<MonthKey, number>();
  for (const item of items) {
    const key = monthKeyOf(item.date);
    totals.set(key, (totals.get(key) ?? 0) + item.amountCents);
  }
  return totals;
}

export function firstMonthOf(items: readonly Dated[]): MonthKey | null {
  let first: MonthKey | null = null;
  for (const item of items) {
    const key = monthKeyOf(item.date);
    if (first === null || key < first) first = key;
  }
  return first;
}

/** The `size` months before `focal`, never earlier than the first month with data. Oldest first. */
export function windowFor(focal: MonthKey, size: number, firstMonth: MonthKey | null): MonthKey[] {
  if (firstMonth === null) return [];
  const months: MonthKey[] = [];
  for (let i = size; i >= 1; i--) {
    const key = addMonthsToKey(focal, -i);
    if (key >= firstMonth) months.push(key);
  }
  return months;
}

/**
 * Usual range for `focal`. Months without spend inside the span count as zero.
 * `firstMonth` is the first month with any data (global, so a rarely used type still gets zero months).
 */
export function computeUsual(
  totals: ReadonlyMap<MonthKey, number>,
  firstMonth: MonthKey | null,
  focal: MonthKey,
  size: number,
): UsualRange | null {
  const months = windowFor(focal, size, firstMonth);
  if (months.length < MIN_USUAL_MONTHS) return null;
  const values = months.map((m) => totals.get(m) ?? 0);
  return {
    months,
    median: Math.round(median(values)),
    lower: Math.round(percentile(values, 25)),
    upper: Math.round(percentile(values, 75)),
  };
}

function cumulativeUpToDay(items: readonly Dated[], month: MonthKey, day: number): number {
  let sum = 0;
  for (const item of items) {
    if (monthKeyOf(item.date) === month && dayOfMonth(item.date) <= day) sum += item.amountCents;
  }
  return sum;
}

/** Where the month in progress stands against the usual cumulative curve. */
export function computePace(items: readonly Dated[], today: IsoDate, size: number): Pace {
  const focal = monthKeyOf(today);
  const day = dayOfMonth(today);

  let spentToDate = 0;
  let scheduled = 0;
  for (const item of items) {
    if (monthKeyOf(item.date) !== focal) continue;
    if (item.date <= today) spentToDate += item.amountCents;
    else scheduled += item.amountCents;
  }

  const usual = computeUsual(totalsByMonth(items), firstMonthOf(items), focal, size);
  if (!usual) {
    return {
      spentToDate,
      scheduled,
      usual: null,
      usualToDate: null,
      expectedRemaining: null,
      projected: null,
      state: null,
      betterThanUsual: false,
    };
  }

  const usualToDate = Math.round(median(usual.months.map((m) => cumulativeUpToDay(items, m, day))));
  const expectedRemaining = Math.max(0, usual.median - usualToDate);
  // Usual spending already contains recurring charges, so scheduled rows are not added on top.
  const projected = spentToDate + Math.max(expectedRemaining, scheduled);

  let state: PaceState = 'onTrack';
  if (spentToDate > usual.upper) state = 'over';
  else if (projected > usual.upper) state = 'trendingOver';

  return {
    spentToDate,
    scheduled,
    usual,
    usualToDate,
    expectedRemaining,
    projected,
    state,
    betterThanUsual: state === 'onTrack' && projected < usual.median,
  };
}

export interface MonthAssessment {
  total: number;
  usual: UsualRange | null;
  /** total above the upper bound of the usual range */
  aboveUsual: boolean;
}

/** A complete month (typically last month) against the range of the window before it. */
export function assessMonth(items: readonly Dated[], month: MonthKey, size: number): MonthAssessment {
  const totals = totalsByMonth(items);
  const total = totals.get(month) ?? 0;
  const usual = computeUsual(totals, firstMonthOf(items), month, size);
  return { total, usual, aboveUsual: usual !== null && total > usual.upper };
}
