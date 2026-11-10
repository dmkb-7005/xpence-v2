# Xpence

Local-first personal expense tracker (PWA). All data stays in IndexedDB on the device. See `docs/`:

- `docs/SCOPE.md`: goals, screens, rules
- `docs/ARCHITECTURE.md`: stack, hosting, backup flow, phases
- `docs/DATA-MODEL.md`: tables, calculations, backup schema, legacy mapping

## Develop

```bash
npm install
npm run dev        # http://localhost:5173/xpence/
npm run typecheck
npm test
npm run build
```

## Deploy

Pushing to `main` builds and publishes to https://dmkb-7005.github.io/xpence/ via GitHub Actions.
One-time setup: repository **Settings → Pages → Source: GitHub Actions**.
Commit `package-lock.json` (created by `npm install`), because the workflow uses `npm ci`.

## Privacy

The repo is public. Never commit legacy exports, backups or CSV files (see `.gitignore`).
Put the old JSON exports in `legacy-data/` for the one-off migration script.
