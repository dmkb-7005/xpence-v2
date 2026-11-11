# Xpence: Architecture

## Stack

| Concern | Choice |
|---|---|
| Build | Vite 6, React 19, TypeScript (strict, `noUncheckedIndexedAccess`) |
| Routing | React Router 7 with **`HashRouter`** (GitHub Pages has no SPA fallback) |
| Storage | Dexie 4 + `dexie-react-hooks` (`useLiveQuery`) on IndexedDB |
| Validation | Zod 4 (backup restore) |
| Dates | date-fns |
| Tests | Vitest, `fake-indexeddb` for database tests |
| PWA | `vite-plugin-pwa` (Workbox), `registerType: 'prompt'` |
| Styling | CSS Modules + CSS variables, dark theme only, no UI kit |
| Fonts | Inter and Space Grotesk, bundled via `@fontsource` (no network fetch) |
| Charts | none |

**State**: the database is the source of truth. Screens subscribe with Dexie live queries. No Redux, Zustand or server cache. The only non-database state is the remembered expense date (sessionStorage) and UI state.

**Alternatives rejected**: SQLite/OPFS (hard to ship in a PWA, unnecessary at about 6k rows), Dexie Cloud and Drive/Dropbox APIs (break the no-account rule), `eval` or mathjs for the amount (unsafe or heavy; a small parser is enough), list virtualisation (chunked loading is enough).

## Hosting and repository

- Repo `dmkb-7005/xpence-v2`, served at https://dmkb-7005.github.io/xpence-v2/. Vite `base` is `'/xpence-v2/'` and **must match the repo name** (a mismatch gives a 404 on the manifest).
- GitHub Actions (`.github/workflows/deploy.yml`) runs `npm ci && npm run build` and publishes with `actions/deploy-pages` on every push to `main`.
- The repo is public. The code is public and the data never is. `.gitignore` contains `legacy-data/*`, `xpence-backup-*.json`, `*.csv`.
- Manifest: `display: standalone`, theme and background `#1a1f2b`, icons 192/512 (`any` and `maskable`), and the shortcut `Add expense` → `./#/expenses/new` with its own icon.
- The Android WebAPK keeps the icon and system-bar colour from install time. After changing either, uninstall and reinstall the app (data survives only via backup, so **back up first**).

## Service worker and updates

The service worker precaches the app shell only and never touches IndexedDB. With `prompt` updates, `UpdateBanner.tsx` shows a centred dialog: **Reload** activates the new version, **Ignore** dismisses it until the next check. The app never changes mid-entry.

## Storage

- IndexedDB is cleared by clearing Chrome site data, uninstalling the PWA, or eviction. On start the app calls `navigator.storage.persist()`; Setup shows whether persistence was granted. It is no guarantee, so **backups are part of the product**.
- Home and Setup show the last backup time with the same rule (`backupStatus` in `domain/setup.ts`) and flag it when older than the reminder setting.

## Backup flow

- **Export backup (JSON)**: build the schema-v1 file, then share it with `navigator.share({ files })` so the Android share sheet can send it to Dropbox or pCloud. Chrome on Android refuses to share `.json` files, so the file is shared as **`xpence-backup-YYYY-MM-DD.json.txt`** with type `text/plain`; the content is plain JSON. If file sharing is unavailable, it downloads as `xpence-backup-YYYY-MM-DD.json`. `lastBackupAt` is set only when the share or download completed, not when the share sheet is cancelled.
- **Export CSV**: a sheet lets the user pick a table; one file per table (see DATA-MODEL). CSV is export-only.
- **Restore**: file picker with `accept=".json,.txt"` (the Android picker reaches Dropbox and pCloud). The file is validated with Zod; errors are shown in plain words, for example `Expense row 2: amount should be a number` or `Not an Xpence backup: missing "incomes" table`. The sheet shows the record counts and asks for confirmation. Before replacing, a recovery copy of the current database is downloaded, then all tables are replaced in **one Dexie transaction**.
- Files are plaintext. Passphrase encryption is a possible later addition.

## Folder layout

```text
src/
  main.tsx
  app/          routes, tab layout with bottom nav, update dialog, version
  db/           Dexie schema, defaults, settings and usage hooks
  domain/       pure logic, each with tests: money, dates, keypad expression,
                repeats, stats (percentiles), usual range and pace, budgets tones,
                home range bar, types above usual (drivers), repeat series, savings,
                usage, expense/income filters and links, setup helpers
  backup/       Zod schema, JSON/CSV export, restore, share/download helpers
  features/     home, expense-form, expenses, budgets, income, setup
  components/   icons, bottom sheet, snackbar, amount card and keypad
  styles/       global.css (tokens, reset)
public/icons/   app, maskable, apple-touch and shortcut icons (SVG sources + PNGs)
docs/           SCOPE.md, ARCHITECTURE.md, DATA-MODEL.md, design/ briefs
tools/
  migrate-legacy/   one-off Node script (not shipped in the app)
legacy-data/        gitignored: the old JSON exports
```

`domain/` and `backup/` have no React imports; `domain/` has no Dexie imports either.

## One-off legacy migration

`tools/migrate-legacy/` (`npm run migrate`) reads `legacy-data/*.json`, decodes them as Windows-1252 (UTF-8 also accepted), applies the mapping in DATA-MODEL.md, validates the result with the app's own Zod schema, prints an anomaly report and writes a schema-v1 backup file. The user restores that file with the normal restore feature, so the app contains no legacy import code. The migration has been run and restored on the device.

## Build phases

All done.

1. Scaffold: Vite, TypeScript, router, PWA manifest and shortcut, Dexie schema, routes, Pages workflow.
2. `domain/` and `backup/` with tests.
3. Legacy migration script and first restore on the device.
4. Design briefs per screen (`docs/design/`), designs made in Claude Design.
5. Add-expense flow: keypad, repeats, pickers by usage, undo.
6. Home and Expenses (filters, selection, exclusion mode, infinite scroll).
7. Budgets and Income.
8. Setup: lists, settings, storage, backup UI; icons; device checks.
9. Cleanup: dead code removed, Zod 4 (`npm audit --omit=dev` clean), docs updated.
10. v2.1.0: repeat-series edit/delete, "above usual by day N" on Home, Budgets values open filtered Expenses.

## Risks

- **Data loss on site-data clear or uninstall**: mitigated by backup reminders and persistent storage. Always export before reinstalling.
- **Sharing `.json` files** in Chrome on Android: resolved by sharing as `.json.txt`; restore accepts both.
- **Dev-only audit findings** (esbuild via Vite in the dev server) do not reach the built app.
