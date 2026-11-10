# Design brief: Budgets (monthly comparison by type)

The name is legacy; there are **no budget targets**. The screen compares actual spending per expense type with the user's usual spending for that type.

## Purpose

See which types drive this month (and the neighbouring months) above or below usual.

## Content

- A **focal month** with the month before and after: three columns, for example *Oct · Nov · Dec 2026*. Arrows (or swipe) move the focal month.
- One block per expense type, then a **Total** block.
- Per type and month: **actual** spend and **usual** (median of that type in the preceding window). Actual is marked *above usual* when over the type's upper bound (75th percentile), otherwise *normal*.
- Future months show only rows already entered (scheduled repeats), for example Dec: Otros `€14,99`.
- Types with no spending in the visible months and no history are omitted.
- *Gastos extra* is a regular type (it collects investment fees, trips etc.) and appears as its own line.

## Sample (focal month November 2026; usual values for the type)

| Type | Oct actual | Nov actual (to date) | Dec actual | Usual (median) | Upper |
|---|---|---|---|---|---|
| Alimentos | €429,21 ▲ | €0,00 | €0,00 | €245,84 | €299,08 |
| Vivienda | €950,00 | €730,00 | €0,00 | €1.075,00 | €1.200,00 |
| Otros | €245,98 ▲ | €29,98 | €14,99 | €81,39 | €185,53 |
| Salidas | €83,40 ▲ | €0,00 | €0,00 | €8,20 | €20,27 |
| Gasolina | €132,73 ▲ | €0,00 | €0,00 | €53,82 | €89,86 |
| Gastos extra | -€424,04 | €0,00 | €0,00 | €473,01 | €1.039,10 |
| Alcohol | €27,04 | €0,00 | €0,00 | €33,07 | €48,48 |
| Internet/Móvil | €30,00 ▲ | €0,00 | €0,00 | €23,70 | €25,17 |
| Gastos caseros | €18,44 | €0,00 | €0,00 | €20,85 | €43,69 |
| **Total** | €1.492,76 | €744,99 (+€14,99 scheduled) | €14,99 | €2.042,54 | €2.604,85 |

(▲ = above usual.) The month in progress only turns "above usual" once spend so far exceeds the upper bound.

## Design challenges

- Three months × 16 types × two values on a 360 px screen is dense. The legacy screen was hard to scan. Alternatives welcome, for example: focus on one month with the neighbours as small secondary figures; or show only actual per column and the usual as a single reference; or sort types by deviation from usual so the "problem" types come first.
- Make "above usual" scannable without charts (colour + icon/arrow + maybe deviation `+€130`).
- Negative actuals (refund-heavy month, like Gastos extra in October) must read correctly.

## States to design

- Focal month = current month (sample above).
- A past focal month (all complete).
- Not enough history for usual values (show actuals only).
- Empty.
