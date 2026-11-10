/**
 * One-off migration of the legacy Xpence JSON exports into a schema-v1 backup file.
 *
 *   npm run migrate                       reads ./legacy-data, writes ./legacy-data/xpence-backup-legacy-import.json
 *   npm run migrate -- --in <dir> --out <file>
 *
 * Restore the resulting file in the app (Setup > Restore). Nothing here is shipped in the app.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { todayIso } from '../../src/domain/dates';
import { formatCents, formatPercent } from '../../src/domain/money';
import { summarizeMonths } from '../../src/domain/savings';
import { migrate } from './transform';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

/** The old files are Windows-1252; plain UTF-8 files are accepted too. */
function decode(buffer: Buffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder('windows-1252').decode(buffer);
  }
}

function readJson(dir: string, names: string[]): unknown {
  for (const name of names) {
    const path = join(dir, name);
    if (existsSync(path)) return JSON.parse(decode(readFileSync(path)));
  }
  throw new Error(`None of ${names.join(', ')} found in ${dir}`);
}

const dir = resolve(arg('in') ?? 'legacy-data');
const out = resolve(arg('out') ?? join(dir, 'xpence-backup-legacy-import.json'));

const { backup, report } = migrate({
  expenseTypes: readJson(dir, ['expenseTypes.json', 'expenseTypes_1.json']),
  groups: readJson(dir, ['groups.json', 'groups_1.json']),
  colors: readJson(dir, ['colors.json']),
  expenses: readJson(dir, ['expenses.json']),
  incomes: readJson(dir, ['incomes.json']),
});

writeFileSync(out, JSON.stringify(backup), 'utf8');

const list = (title: string, items: string[]) => {
  if (items.length === 0) return;
  console.log(`\n${title} (${items.length})`);
  items.slice(0, 15).forEach((s) => console.log(`  ${s}`));
  if (items.length > 15) console.log(`  ... and ${items.length - 15} more`);
};

console.log('Counts (in -> out)');
for (const [table, c] of Object.entries(report.counts)) console.log(`  ${table.padEnd(13)} ${c.in} -> ${c.out}`);
list('Dropped', report.dropped);
list('Date corrected', report.dateFixes);
list('Assigned the default type', report.defaultTypeAssigned);
list('Rounded to cents', report.rounded);
list('Warnings', report.warnings);
console.log(
  `\nKept as is: ${report.negativeExpenses} negative and ${report.zeroExpenses} zero expenses, ` +
    `${report.negativeIncomes} negative incomes, ${report.futureExpenses} future-dated expenses, ` +
    `${report.multilineNotes} multi-line remarks`,
);

// Compare these lines with the legacy app (Income screen, Home screen) before restoring.
const today = todayIso();
console.log('\nCross-check against the legacy app (most recent months, scheduled rows included)');
for (const m of summarizeMonths(backup.incomes, backup.expenses).slice(0, 4)) {
  console.log(
    `  ${m.month}  income ${formatCents(m.incomeCents)}  expenses ${formatCents(m.expensesCents)}  ` +
      `savings ${formatCents(m.savingsCents)}  ${m.savingsPercent === null ? '-' : formatPercent(m.savingsPercent)}`,
  );
}
const month = today.slice(0, 7);
const spent = backup.expenses.filter((e) => e.date.startsWith(month) && e.date <= today).reduce((s, e) => s + e.amountCents, 0);
console.log(`  spent so far in ${month} (up to ${today}): ${formatCents(spent)}`);
console.log(`\nWritten: ${out}`);
