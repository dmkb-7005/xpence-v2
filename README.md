# Xpence

Local-first personal expense tracker, installed as a PWA on Android. All data stays in IndexedDB on the device: no accounts, no server, no sync. Backups are files you export and keep yourself.

Live: https://dmkb-7005.github.io/xpence-v2/

## Docs

- `docs/SCOPE.md`: goals, screens and behaviour
- `docs/ARCHITECTURE.md`: stack, hosting, updates, backup flow, folder layout
- `docs/DATA-MODEL.md`: tables, calculations, backup and CSV format, legacy mapping
- `docs/design/`: the design brief per screen (all implemented)

## Develop

```bash
npm install
npm run dev         # http://localhost:5173/xpence-v2/
npm run typecheck
npm test
npm run build       # typecheck + production build into dist/
npm run preview     # serve the build locally
```

The version shown in Setup is `APP_VERSION` in `src/app/version.ts`.

## Deploy

Pushing to `main` builds and publishes via GitHub Actions. One-time setup: **Settings → Pages → Source: GitHub Actions**. Commit `package-lock.json`, because the workflow uses `npm ci`.

Vite `base` in `vite.config.ts` must match the repo name (`/xpence-v2/`).

On the phone, open the site in Chrome and install it. A new version shows an **Update available** dialog; tap Reload. Changes to the icon or theme colour only show after reinstalling the app: **export a backup first**, since uninstalling deletes the data.

## Backups

- **Setup → Export backup** opens the share sheet (Dropbox, pCloud, ...). The file is named `xpence-backup-YYYY-MM-DD.json.txt` because Chrome won't share `.json`; it is plain JSON.
- **Setup → Restore from backup** accepts `.json` and `.txt`, shows what will be restored, downloads a recovery copy of the current data, then replaces everything.
- **Export CSV** writes one table per file for Excel (`;` separated, decimal commas).

## Legacy migration (one-off, done)

1. Put the old JSON exports in `legacy-data/` (gitignored).
2. `npm run migrate` (or `npm run migrate -- --in <dir> --out <file>`).
3. Restore the resulting `legacy-data/xpence-backup-legacy-import.json` in the app.

## Privacy

The repo is public. Never commit legacy exports, backups or CSV files (see `.gitignore`).
