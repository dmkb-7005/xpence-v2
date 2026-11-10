/** Most used first (usage = number of expenses referencing the item), ties by name. */
export function sortByUsage<T extends { id: string; name: string }>(
  items: readonly T[],
  usage: ReadonlyMap<string, number>,
): T[] {
  return [...items].sort((a, b) => (usage.get(b.id) ?? 0) - (usage.get(a.id) ?? 0) || a.name.localeCompare(b.name));
}
