# Design brief: Home

## Purpose

The screen the app opens to. In two seconds the user must know **how this month is going compared with what is usual**, and be one tap from adding an expense.

## Content, in priority order

1. **This month so far:** spent to date, `€744,99`. The hero number.
2. **Where it is heading:** projected month end `€1.496,54` and the state against the usual range: *on track · better than usual*. Show the usual range `€1.748,77 – €2.604,85` (median `€2.042,54`) in a way that makes "inside / below / above" obvious at a glance. A horizontal range bar with the projection and spend-so-far as markers is acceptable (it is an indicator, not a chart).
3. **Scheduled:** `+€14,99 scheduled this month` (already entered future charges), visually secondary.
4. **Last month:** `€1.492,76` for October, with whether it was above the usual range. If above, this is the user's "save harder" signal and deserves emphasis.
5. **Add expense:** the primary action of the whole app.
6. **Backup status:** "Last backup 3 days ago". Becomes a warning when overdue (default > 14 days or never).
7. Today's date.

Navigation to the other screens comes from the app-wide navigation (see overview), not from a stack of big buttons as in the legacy app.

## States to design

- **On track, better than usual** (the sample data above).
- **Trending over:** spent so far still inside the range, projection above the upper bound. Example: spent `€1.900,00` by day 10, projected `€2.651,55`.
- **Over:** spent so far already above the upper bound, for example `€2.700,00`.
- **Last month above usual:** for example October `€2.900,00` vs upper `€2.604,85`.
- **Not enough history** (fewer than 3 complete months): show totals only, no range or projection, with a short explanation.
- **Empty / first run:** no data. Invite to add the first expense or restore a backup (Setup).
- **Backup overdue** and **never backed up**.
- Snackbar after saving an expense: "Expense saved" / "Saved 4 expenses" (repeat).

## Behaviour notes

- The usual window (3, 6 or 12 months) is a setting; the screen may name it ("usual for the last 12 months").
- Numbers update live when expenses change.
- Tapping the month figures may lead to the Expenses list filtered to this month (nice to have).

## Not wanted

Charts, budgets with targets, motivational gamification.
