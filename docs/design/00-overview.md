# Xpence: Design brief, overview

Read this first. Each screen has its own brief (`01-home.md` … `06-setup.md`); this file holds what applies to all of them.

## What Xpence is

A personal expense tracker for one person on one Android phone, installed as a PWA from Chrome. All data lives on the device. There are no accounts, no sync and no server. It replaces an older app whose screenshots exist, but **those screenshots show functionality only, not the target look**. The rewrite should feel like a modern, native-quality Android app.

## The three jobs, in priority order

1. **Add an expense in a few seconds.** One tap from launch (also via the long-press app-icon shortcut), a big custom keypad, no Android keyboard for the amount.
2. **Know where this month stands** against last month and against the user's *usual range*, including where the month is heading. The user does not budget. He wants to stay inside his usual range and saves harder when last month was above it or this month trends above it.
3. **See income against expenses** per month and year, as clear figures with savings and savings %. **No charts anywhere in the app.** Visual emphasis comes from typography, colour, layout and simple indicators (badges, coloured text, a thin progress or range bar is fine), not from plotted graphs.

## Platform and constraints

- Portrait phone, design at **360–412 px wide** (Android). Must not break at 320 px. A wider layout is not needed.
- Installed PWA in standalone mode: no browser chrome. Respect the status bar and gesture-navigation safe areas.
- One-handed use: primary actions within thumb reach (lower half of the screen) where it does not hurt clarity.
- Touch targets at least 48 × 48 px.
- Fully offline. No web fonts that need the network at runtime (fonts are bundled, or the system font stack is used).
- **Dark theme only.** No light variant is planned; do not design one.
- Accessible contrast (WCAG AA) for text, including red/green amount colours. Never rely on colour alone for over/under: pair it with a word, sign or icon.

## Navigation

Five destinations: **Home, Expenses, Budgets, Income, Setup**, plus the **Add expense** action. The legacy app used a hamburger drawer. A modern alternative is preferred, for example a bottom navigation bar with a prominent central or floating "add" button. Open for the designer to propose.

Add/edit forms (expense, income) are full screens with their own Save / Cancel, no navigation bar.

## Content conventions

- **Language:** UI copy in English. Data names stay Spanish as imported (types such as *Alimentos*, *Vivienda*, *Gastos extra*; groups such as *Vacaciones*, *Bici*; colours such as *Amarillo*, *Rojo oscuro*).
- **Money:** euro, always two decimals, European format: `€1.492,76`, negatives `-€424,04`. Negative expenses are refunds and are valid.
- **Percentages:** one decimal, trailing `.0` dropped: `69.8%`, `50%`.
- **Dates:** chips, headers and forms use `Tue, 10-11-2026`; plain dates `10-11-2026`. Lists may use a shorter form (for example `Fri 14` under a month header).
- **Scheduled (future-dated) expenses** exist: recurring charges entered ahead for the next N months (for example Netflix on the 14th). They must look clearly different from spent money everywhere they appear.

## Recurring visual vocabulary to define once

The designer should define these so all screens use them consistently:

- **Amount styles:** normal expense, refund (negative), income, savings (positive and negative), scheduled/future.
- **Usual-range state** (Home, Budgets): *on track*, *better than usual*, *trending over*, *over*, and *not enough history* (fewer than 3 months of data). Each needs colour + label/icon; see the state colours below.
- **Highlight colours:** user-defined per expense. Use the dark-theme palette from the add-expense design: Rojo oscuro `#D9606A`, Amarillo `#E6C860`, Pink `#DD86CF`, Azul `#8A8CF2`, Verde `#4FBF92`. They mark a row (stripe, dot or subtle tint) and must keep text readable on the dark background.
- **Hidden** items (types/groups/colours the user retired): not offered in pickers, still shown on old rows.
- **Snackbar** with an action ("Expense deleted · Undo", 6 s).
- **Update banner** ("Update available · Reload").
- **Backup overdue** reminder (no backup for more than N days, default 14).
- **Empty states** (fresh install with no data) and **loading** states (brief, data is local).

## Realistic sample data (from the user's real history)

Use these numbers so mockups look true to life. "Today" is **Tue 10 Nov 2026**.

| Figure | Value |
|---|---|
| Spent so far in November (to 10 Nov) | €744,99 |
| Scheduled later in November | €14,99 (Netflix, 14 Nov) |
| Last month (October) total | €1.492,76 |
| Usual month (median, last 12 months) | €2.042,54 |
| Usual range (25th–75th percentile) | €1.748,77 – €2.604,85 |
| Usual spend by day 10 | €1.290,99 |
| Projected November total | €1.496,54 → *on track, better than usual* |

Monthly totals Nov 2025 – Oct 2026: 2.112,72 · 1.972,35 · 1.107,73 · 1.344,62 · 3.810,84 · 1.946,64 · 2.602,48 · 2.329,56 · 1.834,10 · 2.636,32 · 2.611,97 · 1.492,76.

Recent expenses (newest first):

| Date | Type | Amount | Remark | Notes |
|---|---|---|---|---|
| 14 Dec 2026 | Otros | €14,99 | Netflix | scheduled, repeat series |
| 14 Nov 2026 | Otros | €14,99 | Netflix | scheduled, repeat series |
| 5 Nov 2026 | Vivienda | €730,00 | | rent |
| 1 Nov 2026 | Otros | €14,99 | YouTube Premium | |
| 31 Oct 2026 | Alimentos | €42,22 | | |
| 31 Oct 2026 | Alcohol | €2,90 | Vermut Mercadona | |
| 31 Oct 2026 | Gastos caseros | €9,65 | | |
| 30 Oct 2026 | Internet/Móvil | €15,00 | | |

Size of the dataset: about 5.600 expenses since 2016, 307 incomes since 2020, 16 types, 19 groups, 5 colours.

## Deliverables wanted from the design pass

Per screen: the default state, the listed variant states, and the key interaction (for example selection mode, keypad in use). A small set of shared tokens (colours, type scale, spacing, radius) is enough; it will be implemented as CSS variables.

## Established visual system (from the add-expense design)

The first screen is designed: canvas **"Xpence V2 – Add expense"**. Every other screen must look like the same app. Reuse its styles rather than inventing new ones; extend them only where a screen needs something new.

### Colour tokens

| Token | Value | Use |
|---|---|---|
| bg | `#1A1F2B` | screen background |
| surface | `#232A39` | cards, text fields, bottom sheet |
| surface-2 | `#2A3242` | chips, secondary buttons |
| key / key-op | `#242B3A` / `#1F2D45` | keypad digits / operators |
| info-bg | `#1F2D45` | info notes, repeat panel |
| disabled-bg | `#283041` | disabled primary button |
| border / border-dashed | `#343D50` / `#4A5468` | outlines; dashed = "more" or "scheduled" |
| text / text-2 / muted / faint | `#E6EAF2` / `#B4BCCA` / `#9AA3B5` / `#6B7488` | primary, secondary, labels, placeholders |
| accent / on-accent | `#3D9BFF` / `#0B1A2E` | primary actions, selection, operators |
| positive / positive-bg | `#5FD4A0` / `#1D3A35` | refunds, income, positive savings |
| danger / danger-bg / danger-border | `#FF8A90` / `#2A2430` / `#5A3038` | errors, delete, "over" |

### Type and shape

- **Inter** for all UI text (13–16 px body, 600 for titles and buttons). **Space Grotesk** for amounts and numbers, tabular figures; the hero amount is 48 px bold.
- Radii: chips and pill buttons fully rounded (44 px high, radius 22), cards 20, keypad keys 14, sheets 24 at the top.
- Spacing: 16 px side margins, 6 px gaps between chips, 10–14 px between sections.
- Icons: simple 2 px stroke line icons (back chevron, calendar, repeat, trash, clock, refund arrow, backspace).

### Components to reuse

- **Header:** back chevron + title, 56 px; a destructive action (Delete) as a red-outlined pill on the right.
- **Primary button:** full-width 56 px accent pill at the bottom; disabled = `disabled-bg` with faint text. A one-line hint above it (fixed height, never shifts the layout).
- **Chips:** `surface-2` pills; selected = accent fill with on-accent text; "All N" = dashed outline with accent text.
- **Amount card + keypad:** reused unchanged wherever an amount is entered (income form included).
- **Bottom sheet:** for long pick lists (types, groups, colours, filters).
- **Info note:** `info-bg` panel with an accent icon.
- **Badges:** small rounded labels in the amount card or rows. *Refund* = positive colours + refund arrow; *Scheduled* = `surface-2` + clock icon, and the amount shown in `text-2` with a dashed card outline.
- **Error:** danger outline and `danger-bg`, message with an alert icon.
- **Snackbar:** dark raised bar above the bottom button / navigation bar, text + accent action ("Undo").

### Meaning of colour

- **Accent blue** = action and selection. **Green** = money coming back or in (refunds, income, positive savings). **Red** = error, delete, over the usual range. **Amber** (new, suggested `#F2B34B`) = warning: trending over, backup overdue.
- Usual-range states: *on track* and *better than usual* = accent blue (better than usual may add a positive note), *trending over* = amber, *over* = red, *not enough history* = muted. Always with a label or icon, never colour alone.
