import { createPendingCollections, setLinkCollections } from '@/lib/services/collections'

export const COLLECTIONS_NOT_UPDATED = "Link saved, but collections weren't updated"

/**
 * Runs after the link itself saved: creates each pending name (no re-check, duplicates
 * are allowed), then appends the link to `add` plus the new ids and drops its `remove`
 * memberships. Returns the ids it was added to, or null on any failure (collections
 * created before the failure stay).
 */
export async function saveLinkCollections(
  linkId: string,
  add: string[],
  remove: string[],
  newNames: string[],
  dek: CryptoKey,
): Promise<string[] | null> {
  const created = newNames.length > 0 ? await createPendingCollections(newNames, dek) : []
  if (created === null) return null
  const toAdd = [...add, ...created]
  if (toAdd.length === 0 && remove.length === 0) return []
  const ok = await setLinkCollections(linkId, toAdd, remove)
  return ok ? toAdd : null
}
