import { formatChipDate, toIsoDate } from './dates';

export type BackupState = 'ok' | 'overdue' | 'never';

const DAY_MS = 86_400_000;

/** Backup status for Home and Setup; overdue once the last backup is at least `reminderDays` old. */
export function backupStatus(lastBackupAt: string | null, reminderDays: number, now: Date = new Date()): { state: BackupState; days: number } {
  if (lastBackupAt === null || Number.isNaN(Date.parse(lastBackupAt))) return { state: 'never', days: 0 };
  const days = Math.max(0, Math.floor((now.getTime() - Date.parse(lastBackupAt)) / DAY_MS));
  return { state: days >= reminderDays ? 'overdue' : 'ok', days };
}

/** "today", "yesterday", "3 days ago" */
export function daysAgo(days: number): string {
  return days === 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`;
}

/** `Sun, 08-11-2026 · 19:06` in local time */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const date = toIsoDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return `${formatChipDate(date)} · ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** `≈ 4,2 MB`, `850 KB` */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
}

/** Colour picker palette (Setup › Colours). */
export const COLOR_PALETTE = [
  '#D9606A', '#F08A5D', '#E6C860', '#A8C66C', '#4FBF92', '#4FB3BF',
  '#3D9BFF', '#8A8CF2', '#B07FE0', '#DD86CF', '#C9A27E', '#9AA3B5',
] as const;

/** `#e6c860`, `E6C860` → `#E6C860`; null when not a 6-digit hex colour. */
export function normalizeHex(input: string): string | null {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(input.trim());
  return m ? `#${m[1]!.toUpperCase()}` : null;
}

/** Names compare without case, accents or surrounding spaces. */
export function sameName(a: string, b: string): boolean {
  const n = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLowerCase();
  return n(a) === n(b);
}
