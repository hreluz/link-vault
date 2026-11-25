import { createClient } from '@/lib/supabase/client'
import { toEncryptedColumns, fromEncryptedColumns } from '@/lib/crypto/encryptedRow'
import { isTagVisible } from '@/lib/services/tags/tags'
import type { LinkStatus } from '@/lib/types/database'

export const COLLECTION_NAME_MAX = 60
export const COLLECTION_DESCRIPTION_MAX = 200

export type CollectionContent = { name: string; emoji: string | null; description: string | null }
export type Collection = CollectionContent & {
  id: string; user_id: string; created_at: string; updated_at: string
}
export type CollectionWithCounts = Collection & { link_count: number; done_count: number }
export type CollectionMembership = { collection_id: string; link_id: string; position: number; added_at: string }

type CollectionRow = {
  id: string
  user_id: string
  enc_payload: string
  enc_iv: string
  created_at: string
  updated_at: string
}

function decryptRow(row: CollectionRow, dek: CryptoKey): Promise<Collection> {
  return fromEncryptedColumns<CollectionContent, CollectionRow>(row, dek)
}

/** Recently updated first. */
export function sortByRecentlyUpdated<T extends { updated_at: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))
}

/** Collection order: position, then added_at, then link id -- the same order the swap RPC renumbers by. */
export function compareMemberships(a: CollectionMembership, b: CollectionMembership): number {
  if (a.position !== b.position) return a.position - b.position
  const byAdded = Date.parse(a.added_at) - Date.parse(b.added_at)
  if (byAdded !== 0) return byAdded
  return a.link_id < b.link_id ? -1 : a.link_id > b.link_id ? 1 : 0
}

/** "Done" for counts and Play next: read or archived. */
export function isDoneStatus(status: LinkStatus): boolean {
  return status === 'read' || status === 'archived'
}

/** Throws on a database error, so a failed load is never mistaken for "no collections". */
export async function getCollections(dek: CryptoKey): Promise<Collection[]> {
  const supabase = createClient()
  const { data, error } = await supabase.from('collections').select('*')
  if (error) throw new Error(`Failed to load collections: ${error.message}`)
  const collections = await Promise.all((data ?? []).map(row => decryptRow(row, dek)))
  return sortByRecentlyUpdated(collections)
}

/** null when the id is unknown or belongs to someone else (RLS hides it). Throws on a database error. */
export async function getCollection(id: string, dek: CryptoKey): Promise<Collection | null> {
  const supabase = createClient()
  const { data, error } = await supabase.from('collections').select('*').eq('id', id).maybeSingle()
  if (error) {
    // An id that isn't a uuid can't match any row.
    if (error.code === '22P02') return null
    throw new Error(`Failed to load collection: ${error.message}`)
  }
  if (!data) return null
  return decryptRow(data, dek)
}

export type CollectionInput = {
  name: string
  emoji?: string | null
  description?: string | null
}

export type CollectionWriteResult =
  | { data: Collection; error: null }
  | { data: null; error: 'name_required' | 'unauthenticated' | 'db_error' }

function toContent(input: CollectionInput): CollectionContent | null {
  const name = input.name.trim().slice(0, COLLECTION_NAME_MAX)
  if (!name) return null
  const description = input.description?.trim() ? input.description.trim().slice(0, COLLECTION_DESCRIPTION_MAX) : null
  return { name, emoji: input.emoji || null, description }
}

/** Names don't have to be unique: there is no check against existing collections. */
export async function createCollection(input: CollectionInput, dek: CryptoKey): Promise<CollectionWriteResult> {
  const content = toContent(input)
  if (!content) return { data: null, error: 'name_required' }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'unauthenticated' }

  const encoded = await toEncryptedColumns<CollectionContent>(content, dek)
  const { data, error } = await supabase
    .from('collections')
    .insert({ user_id: user.id, ...encoded })
    .select()
    .single()

  if (error || !data) return { data: null, error: 'db_error' }
  return { data: await decryptRow(data, dek), error: null }
}

export async function updateCollection(
  input: CollectionInput & { id: string },
  dek: CryptoKey,
): Promise<CollectionWriteResult> {
  const content = toContent(input)
  if (!content) return { data: null, error: 'name_required' }

  const supabase = createClient()
  const encoded = await toEncryptedColumns<CollectionContent>(content, dek)
  const { data, error } = await supabase
    .from('collections')
    .update(encoded)
    .eq('id', input.id)
    .select()
    .single()

  if (error || !data) return { data: null, error: 'db_error' }
  return { data: await decryptRow(data, dek), error: null }
}

/** Hard delete. Memberships go through `on delete cascade`; the links stay saved. */
export async function deleteCollection(id: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase.from('collections').delete().eq('id', id)
  return !error
}

/** The collection's rows in collection order. Throws on a database error. */
export async function getCollectionMemberships(collectionId: string): Promise<CollectionMembership[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('collection_links')
    .select('collection_id, link_id, position, added_at')
    .eq('collection_id', collectionId)
  if (error) throw new Error(`Failed to load collection links: ${error.message}`)
  return [...(data ?? [])].sort(compareMemberships)
}

/** Ids of the collections a link is in. Throws on a database error. */
export async function getCollectionIdsForLink(linkId: string): Promise<string[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('collection_links')
    .select('collection_id')
    .eq('link_id', linkId)
  if (error) throw new Error(`Failed to load link collections: ${error.message}`)
  return (data ?? []).map(row => row.collection_id)
}

/**
 * Appends the links at the end of the collection, in the given order
 * (`max(position) + 1`, `+ 2`, ...). Returns the inserted rows, or null on failure.
 */
export async function addLinksToCollection(collectionId: string, linkIds: string[]): Promise<CollectionMembership[] | null> {
  if (linkIds.length === 0) return []
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: last, error: maxError } = await supabase
    .from('collection_links')
    .select('position')
    .eq('collection_id', collectionId)
    .order('position', { ascending: false })
    .limit(1)
  if (maxError) return null

  const max = last?.[0]?.position ?? 0
  const rows = linkIds.map((link_id, index) => ({
    collection_id: collectionId,
    link_id,
    user_id: user.id,
    position: max + index + 1,
  }))

  const { data, error } = await supabase
    .from('collection_links')
    .insert(rows)
    .select('collection_id, link_id, position, added_at')
  if (error || !data) return null
  return [...data].sort(compareMemberships)
}

/** Deletes the membership row only; the link stays saved. */
export async function removeLinkFromCollection(collectionId: string, linkId: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase
    .from('collection_links')
    .delete()
    .eq('collection_id', collectionId)
    .eq('link_id', linkId)
  return !error
}

/** Undo of a removal: re-inserts the row with its original position and added_at. */
export async function restoreMembership(row: CollectionMembership): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { error } = await supabase.from('collection_links').insert({ ...row, user_id: user.id })
  return !error
}

/** Renumbers the collection 1..N (clearing ties), then swaps the two rows -- one transaction. */
export async function swapCollectionLinkPositions(collectionId: string, linkA: string, linkB: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase.rpc('swap_collection_link_positions', {
    p_collection_id: collectionId,
    p_link_a: linkA,
    p_link_b: linkB,
  })
  return !error
}

/** Adds the link at the end of each `add` collection and deletes its `remove` memberships. */
export async function setLinkCollections(linkId: string, add: string[], remove: string[]): Promise<boolean> {
  for (const collectionId of add) {
    const inserted = await addLinksToCollection(collectionId, [linkId])
    if (!inserted) return false
  }
  if (remove.length > 0) {
    const supabase = createClient()
    const { error } = await supabase
      .from('collection_links')
      .delete()
      .eq('link_id', linkId)
      .in('collection_id', remove)
    if (error) return false
  }
  return true
}

/**
 * Creates one collection per name (name only) and returns their ids in order.
 * No re-check against existing names: duplicates are allowed. null on any failure;
 * collections created before the failure stay.
 */
export async function createPendingCollections(names: string[], dek: CryptoKey): Promise<string[] | null> {
  const ids: string[] = []
  for (const name of names) {
    const result = await createCollection({ name }, dek)
    if (result.error) return null
    ids.push(result.data.id)
  }
  return ids
}

/** One membership with just the structural fields the counts need (no decryption). */
export type CollectionCountRow = {
  collection_id: string
  status: LinkStatus
  deleted_at: string | null
  tags: Array<{ id: string; is_private: boolean }>
}

type CountQueryRow = {
  collection_id: string
  links: {
    status: LinkStatus
    deleted_at: string | null
    link_tags: Array<{ tag_id: string; tags: { is_private: boolean } | null }>
  } | null
}

/** Structural-only rows for `N links · M done`. Throws on a database error. */
export async function getCollectionCounts(): Promise<CollectionCountRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('collection_links')
    .select('collection_id, links(status, deleted_at, link_tags(tag_id, tags(is_private)))')
    .returns<CountQueryRow[]>()
  if (error) throw new Error(`Failed to load collection counts: ${error.message}`)
  return (data ?? []).flatMap(row => row.links ? [{
    collection_id: row.collection_id,
    status: row.links.status,
    deleted_at: row.links.deleted_at,
    tags: row.links.link_tags.map(lt => ({ id: lt.tag_id, is_private: lt.tags?.is_private ?? false })),
  }] : [])
}

/** Visible (not in Trash, no locked private tag) and done counts per collection id. */
export function countCollectionLinks(
  rows: CollectionCountRow[],
  unlockedTagIds: Set<string>,
): Map<string, { link_count: number; done_count: number }> {
  const counts = new Map<string, { link_count: number; done_count: number }>()
  for (const row of rows) {
    if (row.deleted_at !== null) continue
    if (!row.tags.every(tag => isTagVisible(tag.is_private, tag.id, unlockedTagIds))) continue
    const entry = counts.get(row.collection_id) ?? { link_count: 0, done_count: 0 }
    entry.link_count++
    if (isDoneStatus(row.status)) entry.done_count++
    counts.set(row.collection_id, entry)
  }
  return counts
}

/** Ids of the user's private tags. Unlike getPrivateTagIds, throws on error so a failure can't reveal private links. */
export async function getPrivateTagIdSet(): Promise<Set<string>> {
  const supabase = createClient()
  const { data, error } = await supabase.from('tags').select('id').eq('is_private', true)
  if (error) throw new Error(`Failed to load tags: ${error.message}`)
  return new Set((data ?? []).map(row => row.id))
}

export function formatCollectionCount(linkCount: number, doneCount: number): string {
  return `${linkCount} ${linkCount === 1 ? 'link' : 'links'} · ${doneCount} done`
}
