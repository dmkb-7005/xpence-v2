import type { Expense } from '../../db/schema';
import { repeatDates } from '../../domain/repeats';

export interface ExpenseDraft {
  date: string;
  amountCents: number;
  expenseTypeId: string;
  groupId: string | null;
  colorId: string | null;
  note: string;
  /** 0 = no repeat, N = N additional monthly rows */
  repeatMonths: number;
}

/** The entered row plus N further real rows that share one seriesId. */
export function buildExpenseRows(draft: ExpenseDraft, newId: () => string, nowIso: string): Expense[] {
  const dates = [draft.date, ...repeatDates(draft.date, draft.repeatMonths)];
  const seriesId = dates.length > 1 ? newId() : null;
  return dates.map((date) => ({
    id: newId(),
    date,
    amountCents: draft.amountCents,
    expenseTypeId: draft.expenseTypeId,
    groupId: draft.groupId,
    colorId: draft.colorId,
    note: draft.note.trim(),
    seriesId,
    createdAt: nowIso,
    updatedAt: nowIso,
  }));
}
