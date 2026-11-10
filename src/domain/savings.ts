import { monthKeyOf, type MonthKey } from './dates';
import type { Dated } from './usual';

export interface MonthSummary {
  month: MonthKey;
  incomeCents: number;
  expensesCents: number;
  /** income - expenses */
  savingsCents: number;
  /** savings / income * 100, one decimal; null when there is no income */
  savingsPercent: number | null;
}

export interface YearSummary extends Omit<MonthSummary, 'month'> {
  year: number;
  /** newest first */
  months: MonthSummary[];
}

export function savingsPercent(savingsCents: number, incomeCents: number): number | null {
  if (incomeCents === 0) return null;
  return Math.round((savingsCents / incomeCents) * 1000) / 10;
}

function summarize(incomeCents: number, expensesCents: number) {
  const savingsCents = incomeCents - expensesCents;
  return { incomeCents, expensesCents, savingsCents, savingsPercent: savingsPercent(savingsCents, incomeCents) };
}

/** Every month that has any income or expense row (scheduled rows included), newest first. */
export function summarizeMonths(incomes: readonly Dated[], expenses: readonly Dated[]): MonthSummary[] {
  const income = new Map<MonthKey, number>();
  const spend = new Map<MonthKey, number>();
  for (const i of incomes) income.set(monthKeyOf(i.date), (income.get(monthKeyOf(i.date)) ?? 0) + i.amountCents);
  for (const e of expenses) spend.set(monthKeyOf(e.date), (spend.get(monthKeyOf(e.date)) ?? 0) + e.amountCents);
  const keys = [...new Set([...income.keys(), ...spend.keys()])].sort().reverse();
  return keys.map((month) => ({ month, ...summarize(income.get(month) ?? 0, spend.get(month) ?? 0) }));
}

/** Year totals with their months, newest year first. */
export function summarizeYears(incomes: readonly Dated[], expenses: readonly Dated[]): YearSummary[] {
  const byYear = new Map<number, MonthSummary[]>();
  for (const m of summarizeMonths(incomes, expenses)) {
    const year = Number(m.month.slice(0, 4));
    byYear.set(year, [...(byYear.get(year) ?? []), m]);
  }
  return [...byYear.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, months]) => ({
      year,
      months,
      ...summarize(
        months.reduce((s, m) => s + m.incomeCents, 0),
        months.reduce((s, m) => s + m.expensesCents, 0),
      ),
    }));
}
