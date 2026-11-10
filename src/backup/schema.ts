import { z } from 'zod';
import { isValidIsoDate } from '../domain/dates';
import { SCHEMA_VERSION } from '../db/version';

const id = z.string().min(1);
const text = z.string().min(1);
const isoDate = z.string().refine(isValidIsoDate, 'must be a valid YYYY-MM-DD date');
const cents = z.number().int();

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
        if (seen.has(row.id)) issue(`duplicate id ${row.id}`, [name, i, 'id']);
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
      if (!types.has(e.expenseTypeId)) issue(`unknown expense type ${e.expenseTypeId}`, ['expenses', i, 'expenseTypeId']);
      if (e.groupId !== null && !groups.has(e.groupId)) issue(`unknown group ${e.groupId}`, ['expenses', i, 'groupId']);
      if (e.colorId !== null && !colors.has(e.colorId)) issue(`unknown color ${e.colorId}`, ['expenses', i, 'colorId']);
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
  return {
    ok: false,
    errors: result.error.issues.slice(0, 20).map((i) => `${i.path.join('.') || 'file'}: ${i.message}`),
  };
}
