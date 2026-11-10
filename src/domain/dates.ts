/** Calendar dates are `YYYY-MM-DD` strings and never go through Date parsing, so time zones cannot shift them. */
export type IsoDate = string;
/** `YYYY-MM` */
export type MonthKey = string;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const pad2 = (n: number) => String(n).padStart(2, '0');
const pad4 = (n: number) => String(n).padStart(4, '0');

/** `month` is 1 to 12. */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function isValidIsoDate(value: string): boolean {
  const m = ISO_DATE.exec(value);
  if (!m) return false;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  return year >= 1000 && month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month);
}

export function parseIsoDate(value: IsoDate): { year: number; month: number; day: number } {
  if (!isValidIsoDate(value)) throw new RangeError(`Invalid date: ${value}`);
  return { year: Number(value.slice(0, 4)), month: Number(value.slice(5, 7)), day: Number(value.slice(8, 10)) };
}

export function toIsoDate(year: number, month: number, day: number): IsoDate {
  return `${pad4(year)}-${pad2(month)}-${pad2(day)}`;
}

export function monthKeyOf(date: IsoDate): MonthKey {
  return date.slice(0, 7);
}

export function dayOfMonth(date: IsoDate): number {
  return Number(date.slice(8, 10));
}

export function parseMonthKey(key: MonthKey): { year: number; month: number } {
  const m = /^(\d{4})-(\d{2})$/.exec(key);
  if (!m) throw new RangeError(`Invalid month key: ${key}`);
  return { year: Number(m[1]), month: Number(m[2]) };
}

export function addMonthsToKey(key: MonthKey, months: number): MonthKey {
  const { year, month } = parseMonthKey(key);
  const index = year * 12 + (month - 1) + months;
  return `${pad4(Math.floor(index / 12))}-${pad2((index % 12) + 1)}`;
}

/** Adds months and clamps the day to the last day of the target month (31 Jan + 1 month = 28/29 Feb). */
export function addMonthsClamped(date: IsoDate, months: number): IsoDate {
  const { year, month, day } = parseIsoDate(date);
  const target = parseMonthKey(addMonthsToKey(`${pad4(year)}-${pad2(month)}`, months));
  return toIsoDate(target.year, target.month, Math.min(day, daysInMonth(target.year, target.month)));
}

/** Today's date in the device's local time zone. */
export function todayIso(now: Date = new Date()): IsoDate {
  return toIsoDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/** `10-11-2026` */
export function formatDmy(date: IsoDate): string {
  const { year, month, day } = parseIsoDate(date);
  return `${pad2(day)}-${pad2(month)}-${pad4(year)}`;
}

/** `Tue, 10-11-2026` */
export function formatChipDate(date: IsoDate): string {
  const { year, month, day } = parseIsoDate(date);
  return `${WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()]}, ${formatDmy(date)}`;
}
