import { createClient } from '@/lib/supabase/client'
import { toEncryptedColumns, fromEncryptedColumns } from '@/lib/crypto/encryptedRow'

export type Tag = {
  id: string
  user_id: string
  name: string
  color: string | null
  is_private: boolean
  created_at: string
}
export type TagWithCount = Tag & { link_count: number }

type TagPayload = { name: string; color: string | null }

type TagRow = {
  id: string
  user_id: string
  enc_payload: string
  enc_iv: string
  is_private: boolean
  created_at: string
}

type RawTagRow = TagRow & { link_tags: { id: string }[] }

function decryptRow(row: TagRow, dek: CryptoKey): Promise<Tag> {
  return fromEncryptedColumns<TagPayload, TagRow>(row, dek)
}

export function toKebabCase(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function getTags(dek: CryptoKey): Promise<TagWithCount[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('tags')
    .select('*, link_tags(id)')

  if (error || !data) return []

  const tags = await Promise.all((data as unknown as RawTagRow[]).map(async ({ link_tags, ...row }) => ({
    ...await decryptRow(row, dek),
    link_count: link_tags.length,
  })))

  return tags.sort((a, b) => a.name.localeCompare(b.name))
}

export type CreateTagInput = {
  name: string
  color?: string | null
  is_private?: boolean
}

export type CreateTagResult =
  | { data: Tag; error: null }
  | { data: null; error: 'name_taken' | 'unauthenticated' | 'db_error' }

export async function createTag(input: CreateTagInput, dek: CryptoKey): Promise<CreateTagResult> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'unauthenticated' }

  const name = toKebabCase(input.name)
  if (!name) return { data: null, error: 'db_error' }

  const existing = await getTags(dek)
  if (existing.some(t => t.name.toLowerCase() === name.toLowerCase())) {
    return { data: null, error: 'name_taken' }
  }

  const is_private = input.is_private ?? false
  const encoded = await toEncryptedColumns<TagPayload>({ name, color: input.color ?? null }, dek)

  const { data, error } = await supabase
    .from('tags')
    .insert({ user_id: user.id, ...encoded, is_private })
    .select()
    .single()

  if (error || !data) return { data: null, error: 'db_error' }
  return { data: await decryptRow(data, dek), error: null }
}

export type UpdateTagInput = {
  id: string
  name: string
  color?: string | null
  is_private?: boolean
}

export type UpdateTagResult =
  | { data: Tag; error: null }
  | { data: null; error: 'name_taken' | 'unauthenticated' | 'db_error' }

export async function updateTag(input: UpdateTagInput, dek: CryptoKey): Promise<UpdateTagResult> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'unauthenticated' }

  const name = toKebabCase(input.name)
  if (!name) return { data: null, error: 'db_error' }

  const existing = await getTags(dek)
  if (existing.some(t => t.id !== input.id && t.name.toLowerCase() === name.toLowerCase())) {
    return { data: null, error: 'name_taken' }
  }

  const is_private = input.is_private ?? false
  const encoded = await toEncryptedColumns<TagPayload>({ name, color: input.color ?? null }, dek)

  const { data, error } = await supabase
    .from('tags')
    .update({ ...encoded, is_private })
    .eq('id', input.id)
    .select()
    .single()

  if (error || !data) return { data: null, error: 'db_error' }
  return { data: await decryptRow(data, dek), error: null }
}

export async function getTagLinksCount(id: string): Promise<number> {
  const supabase = createClient()
  const { count } = await supabase
    .from('link_tags')
    .select('*', { count: 'exact', head: true })
    .eq('tag_id', id)
  return count ?? 0
}

export function isTagVisible(isPrivate: boolean, id: string, unlockedTagIds: Set<string>): boolean {
  return !isPrivate || unlockedTagIds.has(id)
}

export async function getPrivateTagIds(): Promise<string[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('tags')
    .select('id')
    .eq('is_private', true)
  return data?.map(t => t.id) ?? []
}

export async function deleteTag(id: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase.from('tags').delete().eq('id', id)
  return !error
}

async function fetchSourceTargetLinkIds(
  sourceId: string,
  targetId: string,
): Promise<{ sourceLinkIds: string[]; targetLinkIds: string[] } | null> {
  const supabase = createClient()
  const [{ data: sourceRows, error: sourceError }, { data: targetRows, error: targetError }] = await Promise.all([
    supabase.from('link_tags').select('link_id').eq('tag_id', sourceId),
    supabase.from('link_tags').select('link_id').eq('tag_id', targetId),
  ])
  if (sourceError || targetError) return null

  return {
    sourceLinkIds: (sourceRows ?? []).map(r => r.link_id),
    targetLinkIds: (targetRows ?? []).map(r => r.link_id),
  }
}

export type MergePreview = { sourceCount: number; targetCount: number; totalAfterMerge: number }

/** Previews the link-count impact of merging sourceId into targetId, without changing anything. */
export async function getMergePreview(sourceId: string, targetId: string): Promise<MergePreview | null> {
  const linkIds = await fetchSourceTargetLinkIds(sourceId, targetId)
  if (!linkIds) return null

  const { sourceLinkIds, targetLinkIds } = linkIds
  const totalAfterMerge = new Set([...sourceLinkIds, ...targetLinkIds]).size

  return { sourceCount: sourceLinkIds.length, targetCount: targetLinkIds.length, totalAfterMerge }
}

/** Moves all links from sourceId onto targetId (deduping links that already have both), then deletes sourceId. */
export async function mergeTag(sourceId: string, targetId: string): Promise<boolean> {
  if (sourceId === targetId) return false

  const supabase = createClient()

  const { data: privacyRows, error: privacyError } = await supabase
    .from('tags')
    .select('id, is_private')
    .in('id', [sourceId, targetId])
  if (privacyError || !privacyRows) return false

  const source = privacyRows.find(r => r.id === sourceId)
  const target = privacyRows.find(r => r.id === targetId)
  if (!source || !target) return false
  if (source.is_private !== target.is_private) return false

  const linkIds = await fetchSourceTargetLinkIds(sourceId, targetId)
  if (!linkIds) return false
  const { sourceLinkIds, targetLinkIds } = linkIds

  const targetLinkIdSet = new Set(targetLinkIds)
  const linkIdsToReassign = sourceLinkIds.filter(id => !targetLinkIdSet.has(id))

  if (linkIdsToReassign.length > 0) {
    const { error } = await supabase
      .from('link_tags')
      .update({ tag_id: targetId })
      .eq('tag_id', sourceId)
      .in('link_id', linkIdsToReassign)
    if (error) return false
  }

  const { error: cleanupError } = await supabase.from('link_tags').delete().eq('tag_id', sourceId)
  if (cleanupError) return false

  return deleteTag(sourceId)
}

/** Gets or creates tags by name, returning their ids. Used when saving/editing a link's tags. */
export async function syncTagsByName(names: string[], dek: CryptoKey): Promise<string[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const kebabNames = (names.length > 0 ? names : ['no-tag']).map(toKebabCase).filter(Boolean)
  const existing = await getTags(dek)

  const ids: string[] = []
  for (const name of kebabNames) {
    const match = existing.find(t => t.name.toLowerCase() === name.toLowerCase())
    if (match) {
      ids.push(match.id)
      continue
    }
    const encoded = await toEncryptedColumns<TagPayload>({ name, color: null }, dek)
    const { data } = await supabase
      .from('tags')
      .insert({ user_id: user.id, ...encoded, is_private: false })
      .select('id')
      .single()
    if (data) {
      existing.push({ id: data.id, user_id: user.id, name, color: null, is_private: false, created_at: new Date().toISOString(), link_count: 0 })
      ids.push(data.id)
    }
  }
  return ids
}
