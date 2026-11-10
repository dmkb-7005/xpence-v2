# Design brief: Expenses list

## Purpose

Look up, check and correct expenses, and **total any subset** of them (by filter or by hand-picked selection).

## Content

A flat list, newest first, including **scheduled (future-dated)** rows at the top. About 5.600 rows exist, loaded in chunks with infinite scroll (no pagination UI).

Each row shows: date, type, amount, remark (if any), group (if any), and the highlight colour (if any). Example rows: see the overview's sample table. Remarks can be long or multi-line: truncate in the list.

The design may group rows by month or day with headers (and optionally a per-group subtotal); this is a welcome improvement over the legacy flat list.

## Filters and search

- Text search in the remark.
- Type, group and colour filters (single or multi-select, designer's choice).
- Date range (presets such as "this month", "last month", "this year" are welcome).
- Active filters should be visible and easy to clear (for example chips).
- Filters should not take much vertical space by default (the legacy app spent a whole row on two dropdowns).

## Totals

A **sticky footer** with the total:
- No selection: total of all rows matching the filters, with the count ("128 expenses · €3.214,55").
- Selection mode: total of the selected rows ("3 selected · €772,21").

## Selection mode

- Long-press a row to start; tap rows to toggle; clear/exit action.
- Selected rows clearly marked.

## Interactions

- Tap a row → edit expense screen.
- After a delete from the edit screen, the list shows the "Undo" snackbar.

## States to design

- Default list, mixed rows (scheduled, with remark, with colour, refund).
- Filtered: for example type *Alimentos*, last month, with active filter chips and footer total.
- Search with no results.
- Selection mode with 3 rows selected.
- Empty (no data at all).

## Not wanted

Charts, swipe-to-delete (deleting is done in the edit screen with undo).
