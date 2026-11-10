import { addMonthsClamped, type IsoDate } from './dates';

export const MAX_REPEAT_MONTHS = 120;

/**
 * Dates of the N additional rows of a repeating expense. Every date is computed from the
 * original date (not chained), so a 31st goes 28 Feb, 31 Mar, 30 Apr and never drifts to the 28th.
 */
export function repeatDates(start: IsoDate, months: number): IsoDate[] {
  if (!Number.isInteger(months) || months < 0 || months > MAX_REPEAT_MONTHS) {
    throw new RangeError(`Repeat months must be an integer from 0 to ${MAX_REPEAT_MONTHS}`);
  }
  return Array.from({ length: months }, (_, i) => addMonthsClamped(start, i + 1));
}
