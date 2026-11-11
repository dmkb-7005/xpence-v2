import { z } from 'zod';
import { isValidIsoDate } from '../domain/dates';
import { SCHEMA_VERSION } from '../db/version';

const id = z.string().min(1);
const text = z.string().min(1);
const isoDate = z.string().refine(isValidIsoDate, 'is not a valid date (YYYY-MM-DD)');
const cents = z.number().int('must be whole cents');

const expenseTypeSchema = z.object({ id, name: text, hidden: z.boolean(), createdAt: text });
const groupSchema = z.object({ id, name: text, hidden: z.boolean(), createdAt: text });
const colorSchema = z.object({
  id,
  name: text,
  hex: z.string().regex(/^#[0-9A-F]{6}$/, 'must be #RRGGBB in upper case'),
  sortOrder: z.number().int(),
  hidden: z.boolean(),
});
const expenseSchema = z.object({
  id,
  date: isoDate,
  amountCents: cents,
  expenseTypeId: id,
  groupId: id.nullable(),
  colorId: id.nullable(),
  note: z.string(),
  seriesId: id.nullable(),
  createdAt: text,
  updatedAt: text,
});
const incomeSchema = z
  .object({
    id,
    date: isoDate,
    amountCents: cents,
    note: z.string(),
    isDividend: z.boolean(),
    isStockSale: z.boolean(),
    createdAt: text,
    updatedAt: text,
  })
  .refine((i) => !(i.isDividend && i.isStockSale), 'an income cannot be both a dividend and a stock sale');
const settingsSchema = z.object({
  usualWindowMonths: z.union([z.literal(3), z.literal(6), z.literal(12)]),
  backupReminderDays: z.number().int().min(1).max(365),
});

export const backupSchema = z
  .object({
    app: z.literal('xpence'),
    schemaVersion: z.literal(SCHEMA_VERSION),
    exportedAt: text,
    settings: settingsSchema,
    expenseTypes: z.array(expenseTypeSchema),
    groups: z.array(groupSchema),
    colors: z.array(colorSchema),
    expenses: z.array(expenseSchema),
    incomes: z.array(incomeSchema),
  })
  .superRefine((b, ctx) => {
    const issue = (message: string, path: (string | number)[]) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, message, path });

    const idsOf = (name: string, rows: readonly { id: string }[]) => {
      const seen = new Set<string>();
      rows.forEach((row, i) => {
        if (seen.has(row.id)) issue(`${row.id} appears twice`, [name, i, 'id']);
        seen.add(row.id);
      });
      return seen;
    };
    const types = idsOf('expenseTypes', b.expenseTypes);
    const groups = idsOf('groups', b.groups);
    const colors = idsOf('colors', b.colors);
    idsOf('expenses', b.expenses);
    idsOf('incomes', b.incomes);

    b.expenses.forEach((e, i) => {
      if (!types.has(e.expenseTypeId)) issue(`id ${e.expenseTypeId} does not exist`, ['expenses', i, 'expenseTypeId']);
      if (e.groupId !== null && !groups.has(e.groupId)) issue(`id ${e.groupId} does not exist`, ['expenses', i, 'groupId']);
      if (e.colorId !== null && !colors.has(e.colorId)) issue(`id ${e.colorId} does not exist`, ['expenses', i, 'colorId']);
    });
  });

export type Backup = z.infer<typeof backupSchema>;
export type BackupSettings = Backup['settings'];

export type ParseBackupResult = { ok: true; backup: Backup } | { ok: false; errors: string[] };

/** Validates a parsed JSON value. Unknown schema versions are rejected with a clear message. */
export function parseBackup(raw: unknown): ParseBackupResult {
  if (typeof raw !== 'object' || raw === null) return { ok: false, errors: ['The file is not a Xpence backup.'] };
  const version = (raw as { schemaVersion?: unknown }).schemaVersion;
  if ((raw as { app?: unknown }).app === 'xpence' && version !== SCHEMA_VERSION) {
    return { ok: false, errors: [`Unsupported schemaVersion ${String(version)} (this app reads ${SCHEMA_VERSION}).`] };
  }
  const result = backupSchema.safeParse(raw);
  if (result.success) return { ok: true, backup: result.data };
  return { ok: false, errors: result.error.issues.slice(0, 20).map(describeIssue) };
}

const TABLE_LABEL: Record<string, string> = {
  expenses: 'Expense', incomes: 'Income', expenseTypes: 'Type', groups: 'Group', colors: 'Colour', settings: 'Settings',
};
const FIELD_LABEL: Record<string, string> = {
  amountCents: 'amount', expenseTypeId: 'type', groupId: 'group', colorId: 'colour', date: 'date', id: 'id', name: 'name',
  hex: 'colour value', note: 'remark', isDividend: 'dividend flag', isStockSale: 'stock sale flag',
};

/** Readable restore errors: `Expense row 1.204: amount should be a number`. */
export function describeIssue(issue: z.ZodIssue): string {
  const [table, index, field] = issue.path;
  if (issue.path.length === 1 && typeof table === 'string' && issue.code === 'invalid_type' && issue.received === 'undefined') {
    return `Not an Xpence backup: missing "${table}" table`;
  }
  if (typeof table === 'string' && typeof index === 'number') {
    const where = `${TABLE_LABEL[table] ?? table} row ${(index + 1).toLocaleString('de-DE')}`;
    const what = typeof field === 'string' ? FIELD_LABEL[field] ?? field : null;
    if (issue.code === 'invalid_type') {
      return what ? `${where}: ${what} ${issue.received === 'undefined' ? 'is missing' : `should be a ${issue.expected}`}` : `${where}: invalid entry`;
    }
    return what ? `${where}: ${what} ${issue.message}` : `${where}: ${issue.message}`;
  }
  return `${issue.path.join('.') || 'File'}: ${issue.message}`;
}
