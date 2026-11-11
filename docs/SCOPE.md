# Xpence: Scope

Xpence is a personal expense tracker, rewritten from a legacy server-backed mobile app as a **local-first PWA** for one user on one Android device.

Status: **v2.1.0, all screens implemented** and in use on the phone. This document describes the app as built.

## Goals

1. **Add an expense in a few seconds.** Everything on the add screen is optimised for speed.
2. **See where the current month stands** against last month and against the user's *usual range*, including the trend for the rest of the month. There are no budget targets. If last month was above the usual range, or this month is trending above it, the user wants to save harder.
3. **See income against expenses** per month and per year (savings and savings %) as plain figures. No charts.

## Hard constraints

- All data stays on the device in IndexedDB (Dexie). No cloud storage, accounts, authentication, server or synchronisation.
- The only data leaving the device is a backup file the user creates and stores himself (Dropbox, pCloud, ...).
- The app code is hosted on GitHub Pages (static files only). **No personal data is ever committed to the repo** (see ARCHITECTURE.md).

## Non-goals

Accounts, sync, multi-device, sub-groups, manually entered budgets, charts, remark autocomplete, merging types, multi-currency (EUR only), encrypted backups (possible later), localisation (UI copy is English; imported names stay Spanish), light theme.

## Conventions

- Money: integer euro cents, always two decimals. Display `€1.492,76`, negatives `-€424,04`.
- Dates: calendar dates `YYYY-MM-DD`, never timestamps.
- Negative and zero amounts are valid. They are refunds or someone else covering an earlier expense, and they reduce totals. Nothing is excluded from totals.
- Types, groups and colours can be renamed and hidden; they can be deleted only while unused. Hidden items disappear from pickers but stay on old rows.
- Names are unique per list, compared ignoring case and accents (`Café` = `cafe`).
- **Dark theme only.** The visual system (tokens, type, components) is in `docs/design/00-overview.md`.

## Navigation

A bottom navigation bar with five tabs: **Home, Expenses, Budgets, Income, Setup**. The Setup tab stays active on its subpages (`/setup/types`, `/setup/groups`, `/setup/colours`). The add/edit forms (`/expenses/new`, `/expenses/:id`, `/income/new`, `/income/:id`) open full screen without the bar.

## Screens

Each screen was designed in Claude Design from the briefs in `docs/design/` and implemented to match. The legacy screenshots only defined functionality.

### Home (`/`)
- **This month card**: spent to date, the pace state against the usual range (on track / trending over / over) and a range bar showing the usual p25–p75 band, the median, today's spend and the projected month end. Scheduled (future-dated) spend for this month is shown when present.
- **Last month card**: last month's total, compared with the usual range of the window before it. It uses the same tone rule as Budgets: green only when *clearly below* usual, amber above, red way above.
- **Not enough history**: until the whole usual window (3, 6 or 12 months, see Setup) has data, the comparison is replaced by a card counting how many of those months exist.
- **Above usual by day N**: when the month is trending over or over, a card lists up to three expense types furthest above their own usual so far, with spent and usual amounts. Tapping one opens Expenses filtered to that type and this month.
- Backup status line (today / N days ago / overdue / never) linking to Setup.
- Add expense is one tap away.

### Add / edit expense (`/expenses/new`, `/expenses/:id`)
- Fields: date, amount, type (required), note, group, highlight colour, repeat.
- **Date**: defaults to the last date chosen in this app session (sessionStorage), otherwise today. A date other than today is outlined so it is not missed.
- **Amount** uses an in-app keypad and never opens the Android keyboard. Phone layout (`1 2 3` on top) with the operator column on the left (`÷ × − +`), then `,`, `0` and backspace. Hold backspace to clear. The field shows the expression and the live result, rounded to cents. A leading `-` is allowed. The hint line has a fixed height so the keypad never jumps.
- **Repeat**: saving creates the entered row plus N further real rows, same day-of-month (clamped to shorter months), sharing a `seriesId`. Editing or deleting one row affects only that row.
- Type and group pickers list **most used first**. Hidden items are not offered.
- Delete is immediate with an **Undo** snackbar.
- **Repeat series**: editing a row that has later rows in its series asks *This and N later ones* or *This expense only* on save; deleting asks the same. Applying to later rows changes amount, type, group, colour and remark; their dates stay. Earlier rows are never touched. Deleting several can be undone.

### Expenses (`/expenses`)
- Grouped by month, newest first, with sticky month headers showing the month total. Includes future-dated (scheduled) rows. **Infinite scroll** in chunks, no virtualisation.
- Filters: date (this month, last month, this year, last 12 months, custom range), type, group and colour (multi-select), and accent-insensitive text search in the note.
- A total bar shows the total of all rows matching the filters.
- **Selection mode**: long-press a row, then tap rows; the bar shows the selected total.
- **Exclusion mode**: long-press the total bar, then tap rows to subtract them from the running total (excluded rows are dimmed, amount struck out); long-press the bar again to leave. Month header totals are not affected.
- Tap a row to edit it.
- Other screens link in with preset filters (`?range=this-month`, or `?month=YYYY-MM&type=<id>`); a whole month shows as `Oct 2026` on the date chip, and the filter chips are shown open.

### Budgets (`/budgets`)
- Arrows move the focal month; three columns show the previous, focal and next month.
- One block per expense type, alphabetical: the type's *usual* (median of its window) and the actual, plus a total block with the difference from usual.
- Tone per cell: **way above** (red), **above** (amber), **below** (green, complete months only), otherwise neutral. Future months show only existing rows and no tone. See DATA-MODEL, Calculations.
- **Tap a value** to open Expenses filtered to that month and type (the Total row filters by month only). Empty cells are not tappable.
- Types with no spending in the visible months and no in-window history are omitted.

### Income (`/income`)
- **Overview**: months newest first under highlighted year headers. Each year and month shows income, expenses, savings and savings %. Months after the current one are left out; the current month includes its scheduled rows.
- **Entries**: a flat list with kind filter (all, regular, dividend, stock sale), date filter and text search, with the same selection mode and total bar as Expenses.
- Add / edit income: date, amount (same keypad), note, kind.
- Dividends and stock sales count as income in all totals.

### Setup (`/setup`)
- **Lists**: Types, Groups and Colours, each on its own page with usage counts. Add, rename, hide/unhide; colours also edit the hex value from a palette or as `#RRGGBB`. Unused items can be deleted, with Undo.
- **Settings**: usual window (3, 6 or 12 months, default 12), backup reminder (days, default 14).
- **Storage**: record counts per table, storage estimate, persistent-storage status.
- **Backup**: last backup time, **Export backup** (share sheet, falling back to download), **Export CSV** per table, **Restore from backup**.
- App version.

## PWA behaviour

Installable and fully offline after the first load. Updates never apply silently: a centred **Update available** dialog offers **Ignore** and **Reload**. The installed icon offers a long-press shortcut **Add expense** that opens the add screen directly.
