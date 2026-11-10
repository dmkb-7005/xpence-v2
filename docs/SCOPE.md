# Xpence: Scope

Xpence is a personal expense tracker, rewritten from a legacy server-backed mobile app as a **local-first PWA** for one user on one Android device.

## Goals

1. **Add an expense in a few seconds.** Everything on the add screen is optimised for speed.
2. **See where the current month stands** against the previous month and against the user's *usual range*, including the trend for the rest of the month. There are no budget targets. If last month was above the usual range, or this month is trending above it, the user wants to save harder.
3. **See income against expenses** per month and per year (savings and savings %) as plain figures. No charts.

## Hard constraints

- All data stays on the device in IndexedDB (Dexie). No cloud storage, accounts, authentication, server or synchronisation.
- The only data leaving the device is a backup file the user creates and stores himself (Dropbox, pCloud, ...).
- The app code is hosted on GitHub Pages (static files only). **No personal data is ever committed to the repo** (see ARCHITECTURE.md).

## Non-goals

Accounts, sync, multi-device, sub-groups, manually entered budgets, charts, remark autocomplete, merging types, multi-currency (EUR only), encrypted backups (possible later), localisation (UI copy is English; imported names stay Spanish).

## Conventions

- Money: integer euro cents, always two decimals. Display like the legacy app: `€1.492,76`, negatives `-€424,04`.
- Dates: calendar dates `YYYY-MM-DD`, never timestamps. Form display `dd/MM/yyyy`, list display `dd-MM-yy`.
- Negative and zero amounts are valid. They are refunds or someone else covering an earlier expense, and they reduce totals.
- Types, groups and colors can be renamed and hidden, never deleted while in use. Hidden items disappear from pickers but stay on old rows.

## Screens

Mobile-first. Visual design follows the legacy look and comes in a later phase. Behaviour below is binding.

### Home (`/`)
Today's date, current-month total (spent up to and including today), last-month total, projected month-end with the state against the usual range (see DATA-MODEL, Calculations), scheduled-but-future amount for this month if any, last backup time with an overdue hint, and buttons: Add expense, View expenses, View budgets, Income, Setup.

### Add / edit expense (`/expenses/new`, `/expenses/:id`)
- Fields: date (default today), amount, type (required), remark (optional), group (optional), highlight color (optional), repeat.
- **Amount** uses an in-app keypad and never opens the Android keyboard. Keys: `0-9 , + - * /`, backspace, clear. The field shows the expression and the live result, rounded to cents. A leading `-` is allowed.
- **Repeat**: a toggle plus a number of months N. Saving creates the entered row plus N further real rows, same day-of-month (clamped to the last day of shorter months), sharing a `seriesId`. Editing or deleting one row affects only that row.
- Type and group pickers list **most used first** (usage = number of expenses). Hidden items are not offered.
- Delete is immediate with an **undo** snackbar.
- Save and Cancel are reachable without scrolling.

### Expenses (`/expenses`)
- Flat list, newest first, including future-dated (scheduled) rows. **Infinite scroll**, no virtualisation: load in chunks of about 50 as the end is reached.
- Filters: text search in the remark, type, group, color, date range.
- Row: date, type, amount, remark, group, color as row highlight. Tap opens edit.
- **Selection**: long-press a row to enter selection mode and tap to toggle. A sticky footer shows the total of the selected rows, otherwise the total of all rows matching the filters.

### Budgets (`/budgets`)
- Arrows move the focal month. Three columns: focal month minus 1, focal month, focal month plus 1.
- One block per expense type, alphabetical. The first line is the type's *usual* median (for the window ending before that month), the second line is the actual. The actual is red when above the type's usual upper bound, otherwise green. For the month in progress it turns red only once spend so far exceeds the upper bound.
- A total row follows the same rules. "Gastos extra" is an ordinary type and therefore its own line.
- Future months show only rows that already exist (repeats). No manual budgets.
- Types with no spending in the three visible months are omitted unless they have any in-window history.

### Income (`/income`)
- Months newest first. A highlighted **year header** precedes each year's months: income, expenses (shown negative, red), savings, savings %. Each month shows the same four values. Savings = income − expenses. Savings % = savings ÷ income, one decimal, trailing `.0` dropped, `-` when income is 0.
- Month expenses include every row dated in that month (scheduled rows too).
- `add income` opens the entry form: date, amount, remark, kind (regular, dividend, stock sale).
- `search`: text in the remark, kind filter (all, regular, dividend, stock sale), date range. Results are a flat list with the same selection mode and sticky total (selected or filtered) as the expense list.
- Dividends and stock sales count as income in all totals.

### Setup (`/setup`)
- Types, groups, colors: add, rename, hide/unhide, usage count. Colors also edit the hex value. Unused items may be deleted.
- Settings: usual window (3, 6 or 12 months, default 12), backup reminder (days, default 14).
- Local storage: record counts per table, storage usage estimate, whether persistent storage is granted (with a request button).
- Backup: last backup time, **export JSON** (share sheet, falling back to download), **export CSV** per table, **restore from JSON**.

## PWA behaviour

Installable, fully offline after the first load, and an update prompt instead of silent updates. The installed icon offers a long-press shortcut **Add expense** that opens the add screen directly.
