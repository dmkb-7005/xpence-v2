import { z } from 'zod';
import { parseBackup, type Backup } from '../../src/backup/schema';
import { todayIso } from '../../src/domain/dates';
import { formatCents, toCents } from '../../src/domain/money';
import { SCHEMA_VERSION } from '../../src/db/version';

// ---- legacy file shapes (as exported by the old app) ----
const num = z.number().int();
const legacyType = z.object({ ExpCat: z.object({ Id: num, Name: z.string(), CreatedOn: z.string() }) });
const legacyGroup = z.object({ Group: z.object({ Id: num, Name: z.string(), CreatedOn: z.string() }) });
const legacyColor = z.object({ HighlightColor: z.object({ Id: num, Hex: z.string(), Name: z.string() }) });
const legacyExpense = z.object({
  Exp: z.object({
    Id: num,
    Date: z.string(),
    ExpCatId: num,
    Amount: z.number(),
    Remark: z.string().nullish(),
    GroupId: num.nullish(),
    HighlightColorId: num.nullish(),
    CreatedOn: z.string().nullish(),
  }),
});
const legacyIncome = z.object({
  Inc: z.object({
    Id: num,
    Date: z.string(),
    Amount: z.number(),
    Remark: z.string().nullish(),
    CreatedOn: z.string().nullish(),
    IsStockSale: z.boolean(),
    IsDividend: z.boolean(),
  }),
});

// ---- decisions for the known data issues in this particular export ----
/** An expense dated 1900-01-01 is a placeholder and is dropped. */
const DROP_DATE = '1900-01-01';
/** Expense ids with a known wrong date. The script refuses to run if the old date does not match. */
const DATE_FIXES: Record<string, { from: string; to: string }> = {
  '2281': { from: '2006-08-06', to: '2016-08-06' },
};
/** Expenses without a type (ExpCatId 0) get this type. */
const DEFAULT_TYPE_NAME = 'Otros';

export interface LegacyInput {
  expenseTypes: unknown;
  groups: unknown;
  colors: unknown;
  expenses: unknown;
  incomes: unknown;
}

type Table = 'expenseTypes' | 'groups' | 'colors' | 'expenses' | 'incomes';

export interface MigrationReport {
  counts: Record<Table, { in: number; out: number }>;
  dropped: string[];
  dateFixes: string[];
  defaultTypeAssigned: string[];
  rounded: string[];
  negativeExpenses: number;
  zeroExpenses: number;
  negativeIncomes: number;
  futureExpenses: number;
  multilineNotes: number;
  warnings: string[];
}

const byNumericId = (a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id, undefined, { numeric: true });
const validStamp = (s: string | null | undefined): s is string =>
  !!s && !s.startsWith('1900') && !Number.isNaN(Date.parse(s));
/** Legacy CreatedOn is sometimes 1900-01-01; the entry date at midnight UTC replaces it. */
const createdAtFor = (stamp: string | null | undefined, date: string) =>
  validStamp(stamp) ? stamp : `${date}T00:00:00.000Z`;
const hasFraction = (amount: number) => Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-6;

export function migrate(input: LegacyInput, now: Date = new Date()): { backup: Backup; report: MigrationReport } {
  const rawTypes = z.array(legacyType).parse(input.expenseTypes).map((r) => r.ExpCat);
  const rawGroups = z.array(legacyGroup).parse(input.groups).map((r) => r.Group);
  const rawColors = z.array(legacyColor).parse(input.colors).map((r) => r.HighlightColor);
  const rawExpenses = z.array(legacyExpense).parse(input.expenses).map((r) => r.Exp);
  const rawIncomes = z.array(legacyIncome).parse(input.incomes).map((r) => r.Inc);

  const report: MigrationReport = {
    counts: {
      expenseTypes: { in: rawTypes.length, out: 0 },
      groups: { in: rawGroups.length, out: 0 },
      colors: { in: rawColors.length, out: 0 },
      expenses: { in: rawExpenses.length, out: 0 },
      incomes: { in: rawIncomes.length, out: 0 },
    },
    dropped: [],
    dateFixes: [],
    defaultTypeAssigned: [],
    rounded: [],
    negativeExpenses: 0,
    zeroExpenses: 0,
    negativeIncomes: 0,
    futureExpenses: 0,
    multilineNotes: 0,
    warnings: [],
  };
  const today = todayIso(now);
  const inPlausibleRange = (date: string) => date >= '2010-01-01' && date <= `${Number(today.slice(0, 4)) + 3}-12-31`;

  const expenseTypes = rawTypes.map((t) => ({
    id: String(t.Id),
    name: t.Name,
    hidden: false,
    createdAt: createdAtFor(t.CreatedOn, t.CreatedOn.slice(0, 10)),
  }));
  const groups = rawGroups.map((g) => ({
    id: String(g.Id),
    name: g.Name,
    hidden: false,
    createdAt: createdAtFor(g.CreatedOn, g.CreatedOn.slice(0, 10)),
  }));
  // sortOrder follows the legacy ids, which is the order the old Setup screen showed
  const colors = [...rawColors]
    .sort((a, b) => a.Id - b.Id)
    .map((c, i) => ({
      id: String(c.Id),
      name: c.Name,
      hex: `#${c.Hex.replace(/^#/, '').toUpperCase()}`,
      sortOrder: i,
      hidden: false,
    }));

  const defaultType = expenseTypes.find((t) => t.name === DEFAULT_TYPE_NAME);

  const expenses: Backup['expenses'] = [];
  for (const e of rawExpenses) {
    const id = String(e.Id);
    const note = (e.Remark ?? '').replace(/\r\n?/g, '\n').trim();

    if (e.Date === DROP_DATE) {
      report.dropped.push(`expense ${id}: dated ${e.Date}, ${formatCents(toCents(e.Amount))}, "${note}"`);
      continue;
    }

    let date = e.Date;
    const fix = DATE_FIXES[id];
    if (fix) {
      if (date !== fix.from) throw new Error(`Expense ${id}: expected date ${fix.from} but found ${date}`);
      date = fix.to;
      report.dateFixes.push(`expense ${id}: ${fix.from} -> ${fix.to}`);
    }
    if (!inPlausibleRange(date)) report.warnings.push(`expense ${id}: unusual date ${date}`);

    let expenseTypeId = String(e.ExpCatId);
    if (e.ExpCatId === 0) {
      if (!defaultType) throw new Error(`Expense ${id} has no type and there is no type named "${DEFAULT_TYPE_NAME}"`);
      expenseTypeId = defaultType.id;
      report.defaultTypeAssigned.push(`expense ${id}: ${date}, ${formatCents(toCents(e.Amount))} -> ${DEFAULT_TYPE_NAME}`);
    }

    const amountCents = toCents(e.Amount);
    if (hasFraction(e.Amount)) report.rounded.push(`expense ${id}: ${e.Amount} -> ${amountCents / 100}`);
    if (amountCents < 0) report.negativeExpenses++;
    if (amountCents === 0) report.zeroExpenses++;
    if (date > today) report.futureExpenses++;
    if (note.includes('\n')) report.multilineNotes++;

    const createdAt = createdAtFor(e.CreatedOn, date);
    expenses.push({
      id,
      date,
      amountCents,
      expenseTypeId,
      groupId: e.GroupId ? String(e.GroupId) : null,
      colorId: e.HighlightColorId ? String(e.HighlightColorId) : null,
      note,
      seriesId: null,
      createdAt,
      updatedAt: createdAt,
    });
  }

  const incomes: Backup['incomes'] = rawIncomes.map((i) => {
    const id = String(i.Id);
    const amountCents = toCents(i.Amount);
    if (hasFraction(i.Amount)) report.rounded.push(`income ${id}: ${i.Amount} -> ${amountCents / 100}`);
    if (amountCents < 0) report.negativeIncomes++;
    if (!inPlausibleRange(i.Date)) report.warnings.push(`income ${id}: unusual date ${i.Date}`);
    const createdAt = createdAtFor(i.CreatedOn, i.Date);
    return {
      id,
      date: i.Date,
      amountCents,
      note: (i.Remark ?? '').replace(/\r\n?/g, '\n').trim(),
      isDividend: i.IsDividend,
      isStockSale: i.IsStockSale,
      createdAt,
      updatedAt: createdAt,
    };
  });

  expenseTypes.sort(byNumericId);
  groups.sort(byNumericId);
  expenses.sort((a, b) => a.date.localeCompare(b.date) || byNumericId(a, b));
  incomes.sort((a, b) => a.date.localeCompare(b.date) || byNumericId(a, b));

  // The result must pass the same validation the app applies on restore.
  const parsed = parseBackup({
    app: 'xpence',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    settings: { usualWindowMonths: 12, backupReminderDays: 14 },
    expenseTypes,
    groups,
    colors,
    expenses,
    incomes,
  });
  if (!parsed.ok) throw new Error(`Migrated data is invalid:\n${parsed.errors.join('\n')}`);

  report.counts.expenseTypes.out = expenseTypes.length;
  report.counts.groups.out = groups.length;
  report.counts.colors.out = colors.length;
  report.counts.expenses.out = expenses.length;
  report.counts.incomes.out = incomes.length;
  return { backup: parsed.backup, report };
}
