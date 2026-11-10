# Design brief: Income (and add / edit income)

## Purpose

See **income versus expenses** month by month and per year, with savings and savings %. This is the user's main long-term view of whether he is saving enough. **No charts**; the legacy figures-based layout is liked, but should look modern.

## Overview list

Newest first. A **year summary** precedes each year's months. Each month and each year shows:

- Income
- Expenses (shown as a negative / in red tone)
- Savings = income − expenses (emphasised)
- Savings % of income (one decimal; `–` when there is no income)

Sample (real data):

| Period | Income | Expenses | Savings | % |
|---|---|---|---|---|
| **Year 2026 (to date)** | €63.381,72 | €22.491,99 | €40.889,73 | 64.5% |
| Oct 2026 | €4.667,37 | €1.492,76 | €3.174,61 | 68% |
| Sep 2026 | €4.458,92 | €2.611,97 | €1.846,95 | 41.4% |
| Feb 2026 | €4.450,82 | €1.344,62 | €3.106,20 | 69.8% |
| Jan 2026 | €5.063,24 | €1.107,73 | €3.955,51 | 78.1% |
| **Year 2025** | €68.378,35 | €26.892,20 | €41.486,15 | 60.7% |
| Dec 2025 | €3.945,02 | €1.972,35 | €1.972,67 | 50% |

Also realistic: the current month with tiny income so far, for example Nov 2026: income `€7,40`, expenses `€759,98`, savings `-€752,58` (negative savings, % not meaningful early in the month; the design should handle this gracefully, for example "month in progress").

Ideas welcome: compact cards per month, a year header that stays sticky while scrolling its months, a simple savings-rate indicator per month (bar or badge, not a chart).

## Search and filters (income entries)

A separate mode/view listing individual income entries:
- Text search in the remark ("Sueldo", "Dividendos", "Venta de acciones VW").
- **Kind filter: all · regular · dividend · stock sale.** 165 dividends and 10 stock sales exist; amounts can be small (`€4,05`) or negative corrections (`-€14,71`).
- Date range.
- Same **selection mode** and sticky total footer as the Expenses list ("12 dividends · €1.204,33").
- Tap an entry → edit income.

## Add / edit income

Fields: date (default today), amount (same custom keypad as expenses), remark, **kind** (regular / dividend / stock sale, exactly one). Save / Cancel; edit mode adds Delete with Undo snackbar. Much less frequent than adding expenses, so it can be simpler.

## States to design

- Overview with year headers and months (sample above).
- Month in progress with negative savings.
- Search mode filtered to dividends, with total footer, and with selection.
- Add income form (keypad, kind selector).
- Empty.

## Notes after the add-expense design

- Follow "Established visual system" in `00-overview.md`.
- Colours: income and positive savings in **green** (positive), expenses in `text` or `muted` with a minus sign, negative savings in **red**. Savings % may use the same colours.
- Year summaries: a raised `surface` card or a sticky header in the same style; months as rows or compact cards.
- **Add / edit income reuses the amount card and keypad exactly.** The only new control is the kind selector: three chips *Regular · Dividend · Stock sale* (exactly one selected, accent fill), styled like the type chips. Date and Remark chips as on the add-expense screen; no Repeat, Group or Colour.
- Kind filter in search mode: the same three chips plus *All*.
- Dividends and stock sales may carry a small badge in lists (like the Refund/Scheduled badges).
