/** Collection-name matching shared by the form field, the picker sheet and Save-time resolution. */

/** Trimmed, case-insensitive substring match. Keeps the given order. An empty query matches nothing. */
export function filterCollectionsByName<T extends { name: string }>(items: T[], query: string): T[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return items.filter(item => item.name.toLowerCase().includes(q))
}

/**
 * Trimmed, case-insensitive exact match. With several same-named items it returns
 * the first in the given order (the most recently updated, for a sorted list).
 */
export function findCollectionByName<T extends { name: string }>(items: T[], name: string): T | undefined {
  const n = name.trim().toLowerCase()
  if (!n) return undefined
  return items.find(item => item.name.trim().toLowerCase() === n)
}
