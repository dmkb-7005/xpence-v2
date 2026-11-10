# Design brief: Setup

## Purpose

Manage the lookup lists, settings and, most importantly, **backups**: the data exists only on this phone, so backup is part of the product.

## Sections

### Expense types, groups, colours
- List with name, **usage count** (number of expenses using it), hidden state.
- Add, rename, hide/unhide. Colours also edit the hex value (a simple colour picker or swatch palette).
- An item that is in use cannot be deleted, only hidden. Unused items can be deleted.
- Hidden items appear dimmed/marked and are not offered in pickers.
- Sample: types 16 (Alimentos 835, Otros 749, Gastos extra 525 … Peluquería 3), groups 19 (Vacaciones 452, La locura española 171, Bici 121 …), colours 5.

### Settings
- **Usual range window:** 3, 6 or 12 months (default 12). Short explanation of what it affects (Home, Budgets).
- **Backup reminder:** after N days (default 14).

### Backup and restore
- **Last backup:** date/time or "never", overdue warning.
- **Export full backup (JSON)**: opens the Android share sheet so the user sends it to Dropbox or pCloud (download as fallback).
- **Export CSV** per table (expenses, incomes, types, groups, colours).
- **Restore from JSON**: pick a file → validation result (record counts, or a list of errors) → explicit confirmation that **all data on the device will be replaced** → a recovery copy of the current data downloads automatically first → success snackbar.

### Storage
- Record counts: 5.606 expenses, 307 incomes, 16 types, 19 groups, 5 colours.
- Storage used (estimate) and whether **persistent storage** is granted, with a button to request it if not.
- App version.

## Layout considerations

Setup mixes rarely used management lists with an important safety function (backup). Consider giving backup status prominence at the top, and putting the lists behind sub-screens or expandable sections. The legacy accordion is acceptable but should look modern.

## States to design

- Overview of Setup.
- Types list with one hidden item, add/rename dialog or sheet.
- Colours list with the edit-colour control.
- Restore flow: file valid (counts + confirm), file invalid (errors).
- Backup overdue / never.
- Persistent storage not granted.

## Notes after the add-expense design

- Follow "Established visual system" in `00-overview.md`.
- Colour list shows the dark-theme palette (`#D9606A`, `#E6C860`, `#DD86CF`, `#8A8CF2`, `#4FBF92`); the edit control picks a swatch or a hex value. These are the user's starting colours and he will adjust them here.
- Add/rename uses a bottom sheet with one text field and the primary pill button.
- Hidden items: dimmed (`faint`) with a "Hidden" badge in the badge style.
- Backup overdue: amber; never backed up: red. Restore confirmation is destructive: red-outlined or red primary button with explicit text ("Replace all data").
- Usual window setting (3, 6, 12 months): three chips, like the type chips.
