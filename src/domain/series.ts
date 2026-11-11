import type { IsoDate } from './dates';

interface SeriesRow {
  id: string;
  date: IsoDate;
  seriesId: string | null;
}

/** Rows of the same repeat series dated after `current`, oldest first. Empty for rows outside a series. */
export function laterInSeries<T extends SeriesRow>(rows: readonly T[], current: SeriesRow): T[] {
  if (current.seriesId === null) return [];
  return rows
    .filter((r) => r.seriesId === current.seriesId && r.id !== current.id && r.date > current.date)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** What an edit may carry over to the later rows of a series. Dates stay as they are. */
export interface SeriesChanges {
  amountCents: number;
  expenseTypeId: string;
  groupId: string | null;
  colorId: string | null;
  note: string;
}

export function applySeriesChanges<T extends SeriesRow & SeriesChanges & { updatedAt: string }>(
  rows: readonly T[],
  changes: SeriesChanges,
  nowIso: string,
): T[] {
  return rows.map((r) => ({ ...r, ...changes, updatedAt: nowIso }));
}
