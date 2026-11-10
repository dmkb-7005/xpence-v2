import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';

/** How many expenses reference each type or group id. Live, never stored, so it cannot drift. */
export function useUsageCounts(index: 'expenseTypeId' | 'groupId'): Map<string, number> | undefined {
  return useLiveQuery(async () => {
    const counts = new Map<string, number>();
    await db.expenses.orderBy(index).eachKey((key) => {
      if (typeof key === 'string') counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return counts;
  }, [index]);
}
