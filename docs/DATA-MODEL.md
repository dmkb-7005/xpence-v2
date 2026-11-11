# Xpence: Data model

## Database

Dexie database `xpence`, `version(1)`. Primary keys are **strings**: legacy numeric ids are imported unchanged (as `"5144"`), new records get UUIDs.

| Table | Fields | Indexes |
|---|---|---|
| `expenseTypes` | `id`, `name`, `hidden`, `createdAt` | `id`, `name` |
| `groups` | `id`, `name`, `hidden`, `createdAt` | `id`, `name` |
| `colors` | `id`, `name`, `hex` (`#RRGGBB`), `sortOrder`, `hidden` | `id` |
| `expenses` | `id`, `date`, `amountCents`, `expenseTypeId`, `groupId \| null`, `colorId \| null`, `note`, `seriesId \| null`, `createdAt`, `updatedAt` | `id`, `date`, `expenseTypeId`, `groupId`, `colorId`, `seriesId` |
| `incomes` | `id`, `date`, `amountCents`, `note`, `isDividend`, `isStockSale`, `createdAt`, `updatedAt` | `id`, `date` |
| `meta` | `key`, `value` | `key` |

`meta` keys: `schemaVersion`, `lastBackupAt`, `usualWindowMonths` (3, 6 or 12, default 12), `backupReminderDays` (default 14).

Rules:
- `amountCents` is an integer, may be negative or zero. `date` is `YYYY-MM-DD`. `note` defaults to `''`.
- `isDividend` and `isStockSale` are never both true (the UI offers regular / dividend / stock sale).
- **Usage** of a type or group is computed live as the number of expenses referencing it (no stored counter, so it cannot drift). Pickers sort by usage descending, then name.
- A type or group with usage above 0 cannot be deleted, only hidden. Hidden items stay resolvable on old rows.
- Repeat of N months: N extra rows, day-of-month clamped to the month's last day (31 Jan → 28/29 Feb → 31 Mar), all sharing a new `seriesId`.

## Money and amount expressions

- Parsing: `Math.round(value * 100)` with half-away-from-zero rounding, applied to the final result of an expression.
- Grammar: numbers with `,` or `.` as decimal separator, binary `+ - * /`, unary `-`, parentheses. Division by zero or malformed input is invalid, so Save is disabled. Examples: `12,50+8,20`, `3*4,5`.
- Formatting is a **custom formatter**, not `Intl` with `es-ES` (which omits the thousands separator for 4-digit numbers): `€` prefix, `.` thousands, `,` decimals, `-€424,04` for negatives.

## Calculations (pure functions in `domain/`)

Let `W` = `usualWindowMonths`. For a month `M`, the **window** is the `W` complete months immediately before `M`, never earlier than the first month with any data. Months with zero spend inside the span count. Until the whole window (`W` complete months) has history, all "usual" comparisons are hidden; Home shows how many of the `W` months exist so far.

- Percentiles use linear interpolation (type 7). `median = p50`.
- `usualTotal(M)` = median of the window's monthly totals.
- **Usual range** `[lower, upper]` = `[p25, p75]` of the window's monthly totals.
- **Cumulative curve**: for each window month `m` and day `d` (1 to 31), `cum_m(d)` = spend dated up to day `d` of `m`; for `d` beyond the month's length it equals the month total. `usualToDate(d)` = median over the window of `cum_m(d)`.

For the month in progress, with `today` on day `d`:
- `spentToDate` = spend dated ≤ today.
- `scheduled` = spend dated after today within the month (repeats already entered).
- `expectedRemaining` = `max(0, usualTotal − usualToDate(d))`.
- `projected = spentToDate + max(expectedRemaining, scheduled)`. Usual spending already contains recurring charges, so scheduled rows are not added on top.
- **State**:
  - `over`: `spentToDate > upper`
  - `trending over`: `projected > upper` and `spentToDate ≤ upper`
  - `on track`: otherwise. Optionally labelled "better than usual" when `projected < median`.

**Last month**: its total is compared with the range of the window preceding it. A total above `upper` is the "save harder" signal on Home.

**Budgets per type** use the same window, median and `upper` computed per type and per column month.

**Savings**: month `income − expenses` with all rows dated in that month. Year totals sum the months. `savings % = savings / income`, shown with one decimal (`69.8%`, `50%`) and `-` when income is 0.

## Backup JSON (schema version 1)

```json
{
  "app": "xpence",
  "schemaVersion": 1,
  "exportedAt": "2026-11-10T00:00:00.000Z",
  "settings": { "usualWindowMonths": 12, "backupReminderDays": 14 },
  "expenseTypes": [{ "id": "1", "name": "Alimentos", "hidden": false, "createdAt": "2020-09-21T20:49:43.187Z" }],
  "groups": [],
  "colors": [{ "id": "2", "name": "Amarillo", "hex": "#FDFF78", "sortOrder": 0, "hidden": false }],
  "expenses": [{
    "id": "5144", "date": "2025-12-27", "amountCents": 4279,
    "expenseTypeId": "16", "groupId": null, "colorId": null, "note": "",
    "seriesId": null, "createdAt": "2025-12-27T17:39:56Z", "updatedAt": "2025-12-27T17:39:56Z"
  }],
  "incomes": [{
    "id": "1", "date": "2020-01-29", "amountCents": 234741, "note": "Sueldo",
    "isDividend": false, "isStockSale": false,
    "createdAt": "2020-01-29T00:00:00.000Z", "updatedAt": "2020-01-29T00:00:00.000Z"
  }]
}
```

`lastBackupAt` is device state and is not part of the file. Restore validates with Zod (including that referenced type, group and color ids exist), rejects an unknown `schemaVersion`, and replaces every table in one transaction. Future schema changes add a Dexie `version(n)` upgrade and a backup migration step.

CSV export: one file per table, UTF-8 with BOM, `;` separator, decimal-comma amounts in a column named `amount` (cents are not exported), ISO dates, `true`/`false` flags, quoted fields where needed.

## Legacy import mapping (`tools/migrate-legacy`)

Input files are Windows-1252, not UTF-8.

| Legacy | New |
|---|---|
| `ExpCat {Id, Name, CreatedOn}` | `expenseTypes {id: String(Id), name, hidden: false, createdAt}`; `UsageRate` dropped (recomputed) |
| `Group {Id, Name, CreatedOn}` | `groups`, same pattern |
| `HighlightColor {Id, Hex, Name}` | `colors`; `hex` normalised to `#RRGGBB` upper case; `sortOrder` follows the legacy array order |
| `Exp.Amount` (decimal) | `amountCents = round(Amount * 100)` |
| `Exp.Date` | `date` unchanged |
| `Exp.ExpCatId` | `expenseTypeId` |
| `Exp.GroupId`, `HighlightColorId` | `groupId`, `colorId`; `0` → `null` |
| `Exp.SubGroupId` | dropped (0 on every row) |
| `Exp.Remark` | `note`; CRLF normalised to LF, trimmed |
| `Exp.CreatedOn` | `createdAt` and `updatedAt` (a missing or `1900-…` value → the entry date at midnight UTC) |
| `Inc.{Id, Date, Amount, Remark}` | `incomes` as above |
| `Inc.IsDividend`, `IsStockSale` | `isDividend`, `isStockSale` |
| `Inc.CreatedOn` | all legacy values are `1900-01-01…`, so `createdAt` = the entry date at midnight UTC |

Decisions for the known data issues (checked against the current export of 5,607 expenses and 307 incomes):

- Expense `2833` (date `1900-01-01`, amount 0, "miami"): **dropped**.
- Expense `2281` (date `2006-08-06`): **date corrected to `2016-08-06`**.
- Expenses `3880` and `5003` have `ExpCatId: 0` (no type), which the new schema does not allow: assigned to **"Otros" (id 7)** and listed in the report for review.
- 9 expenses with more than two decimals: rounded to cents. Negative and zero amounts: kept.
- The two future-dated Netflix rows are valid scheduled repeats. They get no `seriesId` because the legacy data does not link them.

The script prints counts per table, every transformed or dropped row, and fails if Zod validation fails.
