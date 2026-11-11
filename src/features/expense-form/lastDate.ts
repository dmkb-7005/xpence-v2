import { isValidIsoDate } from '../../domain/dates';

const KEY = 'xpence:lastExpenseDate';

/**
 * Date of the last expense added, offered for the next new one (several expenses are often
 * entered for the same day). Kept for the current app session only, so a fresh start is "today".
 */
export function rememberedDate(today: string): string {
  try {
    const value = sessionStorage.getItem(KEY);
    return value && isValidIsoDate(value) ? value : today;
  } catch {
    return today;
  }
}

export function rememberDate(date: string): void {
  try {
    sessionStorage.setItem(KEY, date);
  } catch {
    // private mode or blocked storage: the form simply starts with today
  }
}
