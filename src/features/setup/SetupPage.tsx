import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { buildBackup } from '../../backup/build';
import { tableToCsv, CSV_TABLES, type CsvTable } from '../../backup/csv';
import { downloadText, shareOrDownload } from '../../backup/files';
import { restoreBackup } from '../../backup/restore';
import { parseBackup } from '../../backup/schema';
import { BottomSheet } from '../../components/BottomSheet';
import {
  CheckIcon, ChevronRight, FolderIcon, InfoIcon, PaletteIcon, RestoreIcon, TagIcon, UploadIcon, WarnIcon,
} from '../../components/icons';
import { useSnackbar, useSnackbarPlacement } from '../../components/Snackbar';
import { NAV_HEIGHT } from '../../app/TabLayout';
import { APP_VERSION } from '../../app/version';
import { db } from '../../db/db';
import { useSettings } from '../../db/hooks';
import { todayIso } from '../../domain/dates';
import { backupStatus, daysAgo, formatBytes, formatDateTime } from '../../domain/setup';
import { RestoreSheet, type RestoreCandidate } from './RestoreSheet';
import styles from './Setup.module.css';
import sheet from './Sheets.module.css';

const CSV_LABEL: Record<CsvTable, string> = {
  expenses: 'Expenses', incomes: 'Incomes', expenseTypes: 'Expense types', groups: 'Groups', colors: 'Colours',
};
const WINDOWS = [3, 6, 12] as const;
const REMINDER_MIN = 1;
const REMINDER_MAX = 90;
const n = (v: number) => v.toLocaleString('de-DE');

export function SetupPage() {
  const snackbar = useSnackbar();
  const settings = useSettings();
  const fileInput = useRef<HTMLInputElement>(null);
  const [csvOpen, setCsvOpen] = useState(false);
  const [candidate, setCandidate] = useState<RestoreCandidate | null>(null);
  const [busy, setBusy] = useState(false);
  const [storage, setStorage] = useState<{ usage: number | null; persisted: boolean | null }>({ usage: null, persisted: null });
  useSnackbarPlacement(NAV_HEIGHT + 16);

  const counts = useLiveQuery(async () => ({
    expenses: await db.expenses.count(),
    incomes: await db.incomes.count(),
    types: await db.expenseTypes.count(),
    groups: await db.groups.count(),
    colors: (await db.colors.toArray()).sort((a, b) => a.sortOrder - b.sortOrder),
  }), []);

  const refreshStorage = useCallback(async () => {
    const [estimate, persisted] = await Promise.all([
      navigator.storage?.estimate?.().catch(() => undefined),
      navigator.storage?.persisted?.().catch(() => null),
    ]);
    setStorage({ usage: estimate?.usage ?? null, persisted: persisted ?? null });
  }, []);
  useEffect(() => { void refreshStorage(); }, [refreshStorage, counts?.expenses]);

  const closeCsv = useCallback(() => setCsvOpen(false), []);
  const closeRestore = useCallback(() => { if (!busy) setCandidate(null); }, [busy]);

  if (!settings || !counts) return <div className={styles.screen} />;

  const status = backupStatus(settings.lastBackupAt, settings.backupReminderDays);
  const setMeta = (key: string, value: unknown) => db.meta.put({ key, value });

  async function exportJson() {
    const backup = await buildBackup(db);
    const result = await shareOrDownload(`xpence-backup-${todayIso()}.json`, JSON.stringify(backup), 'application/json');
    if (result === 'cancelled') return;
    await setMeta('lastBackupAt', new Date().toISOString());
    snackbar.show({ message: result === 'shared' ? 'Backup shared' : 'Backup downloaded' });
  }

  async function exportCsv(table: CsvTable) {
    const backup = await buildBackup(db);
    const result = await shareOrDownload(`xpence-${table}-${todayIso()}.csv`, tableToCsv(backup, table), 'text/csv');
    if (result !== 'cancelled') { setCsvOpen(false); snackbar.show({ message: `${CSV_LABEL[table]} exported` }); }
  }

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const file = input.files?.[0];
    input.value = ''; // picking the same file again must fire a new change event
    if (!file) return;
    let raw: unknown;
    try {
      raw = JSON.parse(await file.text());
    } catch {
      setCandidate({ ok: false, name: file.name, size: file.size, errors: ['Not a JSON file.'] });
      return;
    }
    const result = parseBackup(raw);
    setCandidate(result.ok
      ? { ok: true, name: file.name, size: file.size, backup: result.backup }
      : { ok: false, name: file.name, size: file.size, errors: result.errors });
  }

  async function replace() {
    if (!candidate?.ok || busy) return;
    setBusy(true);
    try {
      if (counts!.expenses + counts!.incomes > 0) {
        downloadText(`xpence-backup-recovery-${todayIso()}.json`, JSON.stringify(await buildBackup(db)));
      }
      await restoreBackup(db, candidate.backup);
      snackbar.show({ message: `Restored ${n(candidate.backup.expenses.length)} expenses and ${n(candidate.backup.incomes.length)} incomes` });
      setCandidate(null);
    } catch (e) {
      setCandidate({ ok: false, name: candidate.name, size: candidate.size, errors: [e instanceof Error ? e.message : String(e)] });
    } finally {
      setBusy(false);
    }
  }

  async function requestPersistence() {
    const granted = await navigator.storage?.persist?.().catch(() => false);
    await refreshStorage();
    snackbar.show({ message: granted ? 'Persistent storage granted' : 'Android did not grant persistent storage' });
  }

  const statusBlock = {
    ok: (
      <div className={styles.status}>
        <span className={`${styles.statusIcon} ${styles.iconOk}`}><CheckIcon size={22} strokeWidth={2.2} /></span>
        <div>
          <div className={styles.statusTitle}>Last backup {daysAgo(status.days)}</div>
          <div className={styles.statusSub}>{settings.lastBackupAt && formatDateTime(settings.lastBackupAt)}</div>
        </div>
      </div>
    ),
    overdue: (
      <div className={styles.status}>
        <span className={`${styles.statusIcon} ${styles.iconWarn}`}><WarnIcon size={22} /></span>
        <div>
          <div className={`${styles.statusTitle} ${styles.statusWarn}`}>Backup overdue</div>
          <div className={styles.statusSub}>Last backup {daysAgo(status.days)} · {settings.lastBackupAt && formatDateTime(settings.lastBackupAt).split(' · ')[0]}</div>
        </div>
      </div>
    ),
    never: (
      <div className={styles.status}>
        <span className={`${styles.statusIcon} ${styles.iconDanger}`}><WarnIcon size={22} /></span>
        <div>
          <div className={`${styles.statusTitle} ${styles.statusDanger}`}>Never backed up</div>
          <div className={styles.statusSub}>Your data exists only on this phone</div>
        </div>
      </div>
    ),
  }[status.state];

  const cardTone = status.state === 'overdue' ? styles.cardWarn : status.state === 'never' ? styles.cardDanger : '';

  return (
    <div className={styles.screen}>
      <header className={styles.header}><h1 className={styles.title}>Setup</h1></header>
      <div className={styles.scroll}>
        <h2 className={styles.label}>BACKUP</h2>
        <section className={`${styles.card} ${cardTone}`}>
          {statusBlock}
          <button type="button" className={styles.primary} onClick={() => void exportJson()}><UploadIcon />Export full backup</button>
          <div className={styles.pair}>
            <button type="button" className={styles.secondary} onClick={() => setCsvOpen(true)}><UploadIcon />Export CSV</button>
            <button type="button" className={styles.secondary} onClick={() => fileInput.current?.click()}><RestoreIcon size={18} />Restore</button>
          </div>
          <input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={(e) => void onFile(e)} />
          <div className={styles.hint}>Opens the share sheet, so you can send the file to Dropbox or pCloud.</div>
        </section>

        <h2 className={styles.label}>LISTS</h2>
        <section className={`${styles.card} ${styles.listCard}`}>
          <Link className={styles.link} to="/setup/types">
            <span className={styles.linkIcon}><TagIcon /></span><span className={styles.linkName}>Expense types</span>
            <span className={styles.count}>{counts.types}</span><ChevronRight size={16} className={styles.chev} />
          </Link>
          <Link className={styles.link} to="/setup/groups">
            <span className={styles.linkIcon}><FolderIcon /></span><span className={styles.linkName}>Groups</span>
            <span className={styles.count}>{counts.groups}</span><ChevronRight size={16} className={styles.chev} />
          </Link>
          <Link className={styles.link} to="/setup/colours">
            <span className={styles.linkIcon}><PaletteIcon /></span><span className={styles.linkName}>Colours</span>
            <span className={styles.dots} aria-hidden="true">
              {counts.colors.filter((c) => !c.hidden).slice(0, 6).map((c) => <span key={c.id} style={{ background: c.hex }} />)}
            </span>
            <span className={styles.count}>{counts.colors.length}</span><ChevronRight size={16} className={styles.chev} />
          </Link>
        </section>

        <h2 className={styles.label}>SETTINGS</h2>
        <section className={styles.card}>
          <div className={styles.settingTitle} id="window-label">Usual range window</div>
          <div className={styles.settingText}>How many past months define "usual" on Home and Budgets.</div>
          <div className={styles.three} role="group" aria-labelledby="window-label">
            {WINDOWS.map((w) => (
              <button key={w} type="button" className={styles.choice} aria-pressed={settings.usualWindowMonths === w}
                onClick={() => void setMeta('usualWindowMonths', w)}>{w} months</button>
            ))}
          </div>
          <div className={styles.divider}>
            <div>
              <div className={styles.settingTitle}>Backup reminder</div>
              <div className={styles.settingText}>Warn when the last backup is older than</div>
            </div>
            <div className={styles.stepper}>
              <button type="button" className={styles.step} aria-label="Fewer days" disabled={settings.backupReminderDays <= REMINDER_MIN}
                onClick={() => void setMeta('backupReminderDays', settings.backupReminderDays - 1)}>−</button>
              <output className={styles.stepValue} aria-live="polite">{settings.backupReminderDays} d</output>
              <button type="button" className={styles.step} aria-label="More days" disabled={settings.backupReminderDays >= REMINDER_MAX}
                onClick={() => void setMeta('backupReminderDays', settings.backupReminderDays + 1)}>+</button>
            </div>
          </div>
        </section>

        <h2 className={styles.label}>STORAGE</h2>
        <section className={styles.card}>
          <div className={styles.stat}><span>Expenses</span><span>{n(counts.expenses)}</span></div>
          <div className={styles.stat}><span>Incomes</span><span>{n(counts.incomes)}</span></div>
          <div className={styles.stat}><span>Types · Groups · Colours</span><span>{counts.types} · {counts.groups} · {counts.colors.length}</span></div>
          {storage.usage !== null && <div className={styles.stat}><span>Storage used</span><span>≈ {formatBytes(storage.usage)}</span></div>}
          {storage.persisted === true && (
            <div className={styles.note}><CheckIcon size={16} strokeWidth={2.4} />Persistent storage granted. Android won't clear your data to free space.</div>
          )}
          {storage.persisted === false && (
            <div className={`${styles.note} ${styles.noteWarn}`} style={{ display: 'block' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <WarnIcon size={18} />
                <span><b>Persistent storage not granted.</b> Android may clear app data when the phone runs low on space. Keep backups current.</span>
              </div>
              <button type="button" className={styles.noteButton} onClick={() => void requestPersistence()}>Request persistent storage</button>
            </div>
          )}
          {storage.persisted === null && (
            <div className={styles.note}><InfoIcon size={16} />This browser does not report whether storage is persistent.</div>
          )}
          <div className={styles.version}>Xpence {APP_VERSION}</div>
        </section>
      </div>

      {csvOpen && (
        <BottomSheet title="Export CSV" onClose={closeCsv}>
          <p className={styles.settingText} style={{ margin: '0 4px 10px' }}>One file per table, for Excel or Numbers: semicolons, decimal commas.</p>
          <div className={sheet.buttons}>
            {CSV_TABLES.map((t) => (
              <button key={t} type="button" className={styles.secondary} style={{ height: 52 }} onClick={() => void exportCsv(t)}>
                <UploadIcon />{CSV_LABEL[t]}
              </button>
            ))}
          </div>
        </BottomSheet>
      )}
      {candidate && (
        <RestoreSheet candidate={candidate} current={{ expenses: counts.expenses, incomes: counts.incomes }} busy={busy}
          onReplace={() => void replace()} onChooseAnother={() => { setCandidate(null); fileInput.current?.click(); }} onClose={closeRestore} />
      )}
    </div>
  );
}
