# Xpence: Architecture

## Stack

| Concern | Choice |
|---|---|
| Build | Vite, React, TypeScript (strict) |
| Routing | React Router with **`HashRouter`** (GitHub Pages has no SPA fallback) |
| Storage | Dexie + `dexie-react-hooks` on IndexedDB |
| Validation | Zod (backup restore, forms) |
| Dates | date-fns |
| Tests | Vitest, `fake-indexeddb` for database tests |
| PWA | `vite-plugin-pwa` (Workbox), `registerType: 'prompt'` |
| Styling | CSS Modules + CSS variables, no UI kit (decided in the design phase) |
| Charts | none |

**State**: the database is the source of truth. Screens subscribe with Dexie live queries. No Redux, Zustand or server cache.

**Alternatives rejected**: SQLite/OPFS (hard to ship in a PWA, unnecessary at about 6k rows), Dexie Cloud and Drive/Dropbox APIs (break the no-account rule), `eval` or mathjs for the amount (unsafe or heavy; a small parser is enough), list virtualisation (about 6k rows and chunked loading make it unnecessary).

## Hosting and repository

- GitHub Pages, deployed by a GitHub Actions workflow (`npm ci && npm run build`, then `actions/deploy-pages`). Vite `base` is `'/<repo-name>/'`.
- Pages on a free account needs a **public repo**. The code is public and the data never is. `.gitignore` must contain `legacy-data/`, `xpence-backup-*.json`, `*.csv`. Nothing under `legacy-data/` is ever committed.
- Manifest: `start_url` and `scope` under the base path, `display: standalone`, and `shortcuts: [{ name: "Add expense", url: "./#/expenses/new" }]`.
- The service worker precaches the app shell only. It never touches IndexedDB. With `prompt` updates, a banner offers "Update available, reload" so the app never changes mid-entry.

## Storage constraints

- IndexedDB is cleared by clearing Chrome site data, uninstalling the PWA, or eviction. On first launch call `navigator.storage.persist()`. It reduces eviction pressure but is no guarantee, so **backups are part of the product**.
- Home and Setup show the last backup time and flag it when older than the reminder setting.

## Backup flow

- **Export JSON**: build the file, then `navigator.canShare({ files })` → `navigator.share({ files })` so the Android share sheet can send it to Dropbox or pCloud. If file sharing is unsupported, download via `<a download>`. File name `xpence-backup-YYYY-MM-DD.json`. `meta.lastBackupAt` is set only when the share or download call succeeded.
- **Export CSV**: one file per table, UTF-8 with BOM, `;` separator, decimal comma amounts, for European Excel. CSV is export-only.
- **Restore JSON**: `<input type="file" accept=".json">` (the Android picker can reach Dropbox and pCloud). Validate with Zod, reject unknown `schemaVersion`, show record counts and ask for confirmation. Before replacing, offer a recovery download of the current database, then replace all tables in **one Dexie transaction**.
- Files are plaintext. Optional passphrase encryption is a possible later addition.

## Folder layout

```text
src/
  main.tsx
  app/          routes, shell, update banner
  db/           Dexie schema, typed tables, queries
  domain/       pure logic: money, dates, expression parser, repeats,
                stats (median/percentile), usual range, pace, savings
  backup/       Zod schema, export JSON/CSV, restore
  features/     home, expense-form, expenses, budgets, income, setup
  components/   keypad, pickers, snackbar, list rows
  styles/
public/         icons, manifest assets
docs/           SCOPE.md, ARCHITECTURE.md, DATA-MODEL.md
tools/
  migrate-legacy/   one-off Node script (not shipped in the app)
legacy-data/        gitignored: the old JSON exports
```

`domain/` has no React or Dexie imports and gets Vitest coverage first.

## One-off legacy migration

`tools/migrate-legacy/` is a Node script that reads `legacy-data/*.json`, decodes them as **Windows-1252**, applies the mapping in DATA-MODEL.md, validates the result with the app's own Zod schema, prints an anomaly report, and writes a schema-v1 backup JSON. The user restores that file with the normal restore feature, so the app contains no legacy import code.

## Build phases

1. Scaffold: Vite, TypeScript, router, PWA manifest and shortcut, Dexie schema, empty routes, GitHub Pages workflow.
2. `domain/` and `backup/` with tests (parser, repeats, percentiles, pace curve, savings, backup round trip).
3. Legacy migration script and a first restore on the device.
4. Add-expense flow: keypad, repeats, pickers sorted by usage, undo.
5. Expenses list (infinite scroll, filters, selection) and Home totals.
6. Budgets and Income screens (kind filters, search, selection totals).
7. Setup: lookups, settings, storage info, backup UI.
8. Visual design pass from the legacy look.

## Risks

- **Data loss on site-data clear**: mitigated by backup reminders and persistent storage.
- **File sharing support for `.json`** in Chrome on Android: verify on the device in phase 7, with the download fallback.
- **Year-old browsers on the device**: Dexie and the used APIs are widely supported, but check the minimum Chrome version before relying on `navigator.share` with files.
