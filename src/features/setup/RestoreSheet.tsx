import { BottomSheet } from '../../components/BottomSheet';
import { CheckIcon, DownloadIcon, FileIcon, WarnIcon } from '../../components/icons';
import type { Backup } from '../../backup/schema';
import { formatBytes, formatDateTime } from '../../domain/setup';
import styles from './Sheets.module.css';

export type RestoreCandidate =
  | { ok: true; name: string; size: number; backup: Backup }
  | { ok: false; name: string; size: number; errors: string[] };

interface Props {
  candidate: RestoreCandidate;
  current: { expenses: number; incomes: number };
  busy: boolean;
  onReplace: () => void;
  onChooseAnother: () => void;
  onClose: () => void;
}

const n = (v: number) => v.toLocaleString('de-DE');
const SHOWN_ERRORS = 3;

export function RestoreSheet({ candidate, current, busy, onReplace, onChooseAnother, onClose }: Props) {
  const hasData = current.expenses + current.incomes > 0;
  const fileRow = (
    <div className={styles.fileRow}>
      <FileIcon />
      <div style={{ minWidth: 0 }}>
        <div className={styles.fileName}>{candidate.name}</div>
        <div className={styles.fileSize}>{formatBytes(candidate.size)}</div>
      </div>
    </div>
  );

  if (!candidate.ok) {
    const shown = candidate.errors.slice(0, SHOWN_ERRORS);
    const more = candidate.errors.length - shown.length;
    return (
      <BottomSheet title="Restore backup" onClose={onClose} headerAction={<span />}
        footer={
          <div className={styles.buttons}>
            <button type="button" className={styles.primary} onClick={onChooseAnother}>Choose another file</button>
            <button type="button" className={styles.cancel} onClick={onClose}>Cancel</button>
          </div>
        }>
        {fileRow}
        <div className={`${styles.verdict} ${styles.bad}`}><WarnIcon size={16} />This file can't be restored</div>
        <ul className={styles.errors}>
          {shown.map((e) => <li key={e}>{e}</li>)}
          {more > 0 && <li>…and {more} more {more === 1 ? 'error' : 'errors'}</li>}
        </ul>
        <p className={styles.unchanged}>Nothing was changed on this phone.</p>
      </BottomSheet>
    );
  }

  const b = candidate.backup;
  return (
    <BottomSheet title="Restore backup" onClose={onClose} headerAction={<span />}
      footer={
        <div className={styles.buttons}>
          <button type="button" className={styles.danger} disabled={busy} onClick={onReplace}>{busy ? 'Restoring…' : 'Replace all data'}</button>
          <button type="button" className={styles.cancel} disabled={busy} onClick={onClose}>Cancel</button>
        </div>
      }>
      {fileRow}
      <div className={`${styles.verdict} ${styles.ok}`}><CheckIcon size={16} />Backup file is valid</div>
      <div className={styles.stat}><span>Expenses</span><span>{n(b.expenses.length)}</span></div>
      <div className={styles.stat}><span>Incomes</span><span>{n(b.incomes.length)}</span></div>
      <div className={styles.stat}><span>Types · Groups · Colours</span><span>{b.expenseTypes.length} · {b.groups.length} · {b.colors.length}</span></div>
      <div className={styles.stat}><span>Created</span><span>{formatDateTime(b.exportedAt)}</span></div>
      <div className={styles.warn}>
        <div className={styles.warnLine}>
          <WarnIcon size={14} />
          <span>
            <b>All data on this phone will be replaced.</b>{' '}
            {hasData ? `${n(current.expenses)} expenses and ${n(current.incomes)} incomes here will be overwritten by the backup.` : 'There is no data here yet.'}
          </span>
        </div>
        {hasData && (
          <div className={styles.warnLine}><DownloadIcon size={14} /><span>A recovery copy of your current data downloads first.</span></div>
        )}
      </div>
    </BottomSheet>
  );
}
