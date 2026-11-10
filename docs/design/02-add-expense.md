# Design brief: Add / edit expense

## Purpose

The most used screen. Entering an amount and a type and saving must take **a few seconds, mostly with the thumb**. It is opened from Home, from the navigation's add action and from the long-press app-icon shortcut "Add expense".

## Fields

| Field | Required | Notes |
|---|---|---|
| Amount | yes | Custom on-screen keypad, never the Android keyboard. |
| Type | yes | 16 types, sorted **most used first** (Alimentos 835 uses, Otros 749, Gastos extra 525, Almuerzo 341, Salidas 340, …). Hidden types not offered. |
| Date | yes | Defaults to today. Changing it is less common. |
| Repeat | no | Toggle + number of months N (1–120). Creates the expense plus N monthly copies. Only when adding, not editing. |
| Remark | no | Free text, can be multi-line. Opens the normal keyboard. |
| Group | no | 19 groups, most used first (Vacaciones, La locura española, Bici, …). "No group" default. |
| Highlight colour | no | 5 colours + "none". |

## The keypad

- Keys: `0–9`, `,` (decimal comma), `+ − × ÷`, backspace, clear.
- The amount display shows the expression as typed (`12,50 + 8,20`) and, once it contains an operation, the live result (`= €20,70`).
- Input rules the design should support visually: at most two decimals; an operator after an operator replaces it; a leading minus is allowed (refund).
- Large keys (at least 56 px high), operators visually distinct from digits.
- The keypad should stay in a fixed position. Messages appearing or disappearing must **not** move it (this was a real annoyance in the first build).

## Layout considerations

- Consider ordering by frequency of use: amount and type first and within thumb reach; date, repeat, remark, group and colour as secondary/collapsible ("More options"), while still easy to reach.
- The type picker is the second most important control. A dropdown is the current solution; better alternatives are welcome, for example chips/grid of the top 6–8 types plus "more", or a bottom sheet with the full list.
- **Save** must always be reachable without scrolling. Save is disabled until amount, type and date are valid; a calm one-line hint says what is missing ("Enter an amount", "Select a type").
- Cancel / back returns without saving.

## Edit mode

Same screen titled "Edit expense", prefilled. Differences:
- No repeat control. If the row belongs to a series: note "Part of a repeating series. Changes apply to this row only."
- A **Delete** action (destructive styling). No confirmation dialog; instead a snackbar "Expense deleted · Undo".

## States to design

- Empty (just opened): amount `€0,00`, type unselected, Save disabled with hint.
- Mid-entry with an expression: `12,50 + 8,20` → `= €20,70`.
- Negative amount (refund): `-25,00`.
- Repeat on, 3 months.
- All optional fields filled, including a highlight colour.
- Edit mode for a series row.
- Error: "Cannot divide by zero".
- No types exist yet (fresh install): pointer to Setup / restore.

## Not wanted

Remark autocomplete, receipt photos, currency choice.
