# Xpence: Data model

## Database

Dexie database `xpence`, `version(1)` (`SCHEMA_VERSION = 1`). Primary keys are **strings**: legacy numeric ids are imported unchanged (as `"5144"`), new records get UUIDs.

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
- **Usage** of a type, group or colour is computed live as the number of expenses referencing it (no stored counter). Pickers sort by usage descending, then name.
- An item with usage above 0 cannot be deleted, only hidden. Hidden items stay resolvable on old rows.
- Names are unique per list, compared ignoring case and accents.
- Repeat of N months: N extra rows, day-of-month clamped to the month's last day (31 Jan → 28/29 Feb → 31 Mar), all sharing a new `seriesId`.

## Money and amount expressions

- Parsing: rounded half away from zero to cents, applied to the final result of the expression.
- Keypad grammar: numbers with `,` as decimal separator, binary `+ − × ÷`, leading `-`. Division by zero or a malformed expression is invalid, so Save is disabled.
- Formatting is a custom formatter, not `Intl` with `es-ES` (which omits the thousands separator for 4-digit numbers): `€` prefix, `.` thousands, `,` decimals, `-€424,04` for negatives.

## Calculations (pure functions in `domain/`)

Let `W` = `usualWindowMonths`. For a month `M`, the **window** is the `W` complete months immediately before `M`, never earlier than the first month with any data. Months with zero spend inside the span count. **Until the whole window has data (all `W` months), every "usual" comparison is hidden**; Home shows how many of the `W` months exist so far.

- Percentiles use linear interpolation (type 7). `median = p50`.
- **Usual range** `[lower, upper]` = `[p25, p75]` of the window's monthly totals.
- **Cumulative curve**: for each window month `m` and day `d` (1 to 31), `cum_m(d)` = spend dated up to day `d` of `m`; beyond the month's length it equals the month total. `usualToDate(d)` = median over the window of `cum_m(d)`.

### Current month (Home)

With `today` on day `d`:
- `spentToDate` = spend dated ≤ today; `scheduled` = spend dated after today within the month.
- `expectedRemaining` = `max(0, median − usualToDate(d))`.
- `projected = spentToDate + max(expectedRemaining, scheduled)`. Usual spending already contains recurring charges, so scheduled rows are not added on top.
- **State**: `over` when `spentToDate > upper`; `trending over` when `projected > upper`; otherwise `on track`.
- **Range bar scale**: `ceil(upper × 1.15 / €500) × €500`. The median label is hidden when it would overlap another label.

### Tone rule (Budgets cells and Home's last month)

For a value `v` against a usual `{median, lower, upper}`:
- **way above**: `v > median + 2·(upper − median)`
- **above**: `v > upper`
- **below** (complete months only): `v < median − 2·(median − lower)`, i.e. *clearly* below
- otherwise neutral; future months have no tone.

Each Budgets column month is compared with **its own** window. Home's last-month card shows green only for *below*.

**Budgets total deltas**: past months show `total − median`; the current month shows `spentToDate − usualToDate(today)` labelled "by day N"; future months show none.

### Savings (Income)

Month `income − expenses` with all rows dated in that month (scheduled rows included). Year totals sum the months. Months after the current one are omitted from the overview. `savings % = savings / income`, one decimal with a trailing `.0` dropped (`69.8%`, `50%`), `-` when income is 0.

## Backup JSON (schema version 1)

```json
{
  "app": "xpence",
  "schemaVersion": 1,
  "exportedAt": "2026-11-10T00:00:00.000Z",
  "settings": { "usualWindowMonths": 12, "backupReminderDays": 14 },
  "expenseTypes": [{ "id": "1", "name": "Alimentos", "hidden": false, "createdAt": "2020-09-21T20:49:43.187Z" }],
  "groups": [],
  "colors": [{ "id": "2", "name": "Amarillo", "hex": "#E6C860", "sortOrder": 0, "hidden": false }],
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

- The file is shared as `xpence-backup-YYYY-MM-DD.json.txt` (download fallback `.json`); the content is the same.
- `lastBackupAt` is device state and is not part of the file.
- Restore validates with Zod (including that referenced type, group and colour ids exist), rejects an unknown `schemaVersion`, reports problems in plain words, and replaces every table in one transaction.
- Future schema changes add a Dexie `version(n)` upgrade and a backup migration step.

The default colour palette suggested in Setup is `#D9606A`, `#E6C860`, `#DD86CF`, `#8A8CF2`, `#4FBF92` (tuned for the dark theme). Migrated colours keep their legacy hex values until edited in Setup.

## CSV export

One file per table, UTF-8 with BOM, `;` separator, decimal-comma amounts in a column named `amount` (cents are not exported), ISO dates, `true`/`false` flags, quoted fields where needed. The expenses file also carries `expenseType`, `group` and `color` name columns next to the ids, so it reads well in Excel.

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

Decisions for the known data issues (5,607 expenses and 307 incomes in the export):

- Expense `2833` (date `1900-01-01`, amount 0, "miami"): **dropped**.
- Expense `2281` (date `2006-08-06`): **date corrected to `2016-08-06`**.
- Expenses `3880` and `5003` have `ExpCatId: 0` (no type): assigned to **"Otros" (id 7)** and listed in the report.
- 9 expenses with more than two decimals: rounded to cents. Negative and zero amounts: kept.
- The two future-dated Netflix rows are valid scheduled repeats, without a `seriesId`.
- "Inversión" stays an ordinary expense group; nothing is excluded from totals.

The script prints counts per table, every transformed or dropped row, and fails if Zod validation fails.
