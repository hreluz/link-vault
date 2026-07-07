import { createClient } from '@/lib/supabase/client'
import { hmacFingerprint } from '@/lib/crypto/vault'
import { toEncryptedColumns, fromEncryptedColumns } from '@/lib/crypto/encryptedRow'
import { syncTagsByName } from '@/lib/services/tags'
import type { LinkStatus } from '@/lib/types/database'
import type { SortBy } from '@/app/dashboard/link/FilterSheet'

export type LinkContent = {
  url: string
  title: string | null
  description: string | null
  site_name: string | null
  image_url: string | null
  duration: string | null
  notes: string | null
}

export type LinkWithTags = LinkContent & {
  id: string
  user_id: string
  category_id: string | null
  status: LinkStatus
  is_favorite: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
  tags: string[] // tag ids
}

export type LinkFilterParams = {
  textSearch: string
  categoryId: string | null
  statuses: LinkStatus[]
  tagIds: string[]
  tagMode: 'any' | 'all'
  favoritesOnly: boolean
  sortBy: SortBy
  unlockedTagIds: string[]
}

export const SELECT_ALL_MATCHING_CAP = 2000
const FETCH_CHUNK_SIZE = 200

type LinkRow = {
  id: string
  user_id: string
  category_id: string | null
  status: LinkStatus
  is_favorite: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
  enc_payload: string
  enc_iv: string
}

type LinkQueryRow = LinkRow & {
  link_tags: Array<{ tag_id: string }>
}

async function toLinkWithTags(row: LinkRow, tags: string[], dek: CryptoKey): Promise<LinkWithTags> {
  const link = await fromEncryptedColumns<LinkContent, LinkRow>(row, dek)
  return { ...link, tags }
}

export type CreateLinkInput = {
  url: string
  title?: string | null
  description?: string | null
  image_url?: string | null
  duration?: string | null
  category_id: string
  status: LinkStatus
  notes?: string | null
  tags: string[]
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

async function insertLinkTags(linkId: string, tagIds: string[]): Promise<void> {
  if (tagIds.length === 0) return
  const supabase = createClient()
  await supabase.from('link_tags').insert(tagIds.map(tag_id => ({ link_id: linkId, tag_id })))
}

export async function createLink(input: CreateLinkInput, dek: CryptoKey): Promise<LinkWithTags | null> {
  if (!input.url.trim() || !isValidUrl(input.url)) return null
  if (!input.category_id) return null

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const url = input.url.trim()
  const content: LinkContent = {
    url,
    title: input.title ?? null,
    description: input.description ?? null,
    site_name: new URL(url).hostname,
    image_url: input.image_url ?? null,
    duration: input.duration ?? null,
    notes: input.notes ?? null,
  }

  const encoded = await toEncryptedColumns<LinkContent>(content, dek)
  const url_fingerprint = await hmacFingerprint(url, dek)

  const { data: link, error } = await supabase
    .from('links')
    .insert({
      user_id: user.id,
      ...encoded,
      url_fingerprint,
      category_id: input.category_id,
      status: input.status,
    })
    .select()
    .single()

  if (error || !link) return null

  const tagIds = await syncTagsByName(input.tags.filter(Boolean), dek)
  await insertLinkTags(link.id, tagIds)

  return { ...content, id: link.id, user_id: link.user_id, category_id: link.category_id, status: link.status,
    is_favorite: link.is_favorite, created_at: link.created_at, updated_at: link.updated_at,
    deleted_at: link.deleted_at, tags: tagIds }
}

export type UpdateLinkInput = {
  id: string
  url: string
  title?: string | null
  description?: string | null
  image_url?: string | null
  duration?: string | null
  category_id: string
  status: LinkStatus
  notes?: string | null
  tags: string[]
}

export async function toggleLinkFavorite(id: string, isFavorite: boolean): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase
    .from('links')
    .update({ is_favorite: isFavorite })
    .eq('id', id)
  return !error
}

export async function updateLink(input: UpdateLinkInput, dek: CryptoKey): Promise<LinkWithTags | null> {
  if (!input.url.trim() || !isValidUrl(input.url)) return null
  if (!input.category_id) return null

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const url = input.url.trim()
  const content: LinkContent = {
    url,
    title: input.title ?? null,
    description: input.description ?? null,
    site_name: new URL(url).hostname,
    image_url: input.image_url ?? null,
    duration: input.duration ?? null,
    notes: input.notes ?? null,
  }

  const encoded = await toEncryptedColumns<LinkContent>(content, dek)
  const url_fingerprint = await hmacFingerprint(url, dek)

  const { data: link, error } = await supabase
    .from('links')
    .update({
      ...encoded,
      url_fingerprint,
      category_id: input.category_id,
      status: input.status,
    })
    .eq('id', input.id)
    .select()
    .single()

  if (error || !link) return null

  await supabase.from('link_tags').delete().eq('link_id', input.id)

  const tagIds = await syncTagsByName(input.tags.filter(Boolean), dek)
  await insertLinkTags(link.id, tagIds)

  return { ...content, id: link.id, user_id: link.user_id, category_id: link.category_id, status: link.status,
    is_favorite: link.is_favorite, created_at: link.created_at, updated_at: link.updated_at,
    deleted_at: link.deleted_at, tags: tagIds }
}

/** Unpaginated -- used only by Import/Export, never the main list. */
export async function getLinks(dek: CryptoKey): Promise<LinkWithTags[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('links')
    .select('*, link_tags(tag_id)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .returns<LinkQueryRow[]>()

  if (error || !data) return []

  return Promise.all(data.map(({ link_tags, ...row }) =>
    toLinkWithTags(row, link_tags.map(lt => lt.tag_id), dek)
  ))
}

/** Fetches specific links by id (chunked) and decrypts them. Used by client-side search/sort. */
export async function getLinksByIds(ids: string[], dek: CryptoKey): Promise<LinkWithTags[]> {
  if (ids.length === 0) return []
  const supabase = createClient()

  const rows: LinkQueryRow[] = []
  for (let i = 0; i < ids.length; i += FETCH_CHUNK_SIZE) {
    const chunk = ids.slice(i, i + FETCH_CHUNK_SIZE)
    const { data } = await supabase
      .from('links')
      .select('*, link_tags(tag_id)')
      .in('id', chunk)
      .returns<LinkQueryRow[]>()
    if (data) rows.push(...data)
  }

  return Promise.all(rows.map(({ link_tags, ...row }) =>
    toLinkWithTags(row, link_tags.map(lt => lt.tag_id), dek)
  ))
}

function toRpcFilterArgs(params: LinkFilterParams) {
  return {
    p_category_id: params.categoryId,
    p_statuses: params.statuses.length ? params.statuses : null,
    p_tag_ids: params.tagIds.length ? params.tagIds : null,
    p_tag_mode: params.tagMode,
    p_favorites_only: params.favoritesOnly,
    p_unlocked_tag_ids: params.unlockedTagIds.length ? params.unlockedTagIds : null,
  }
}

export type LinksPage = { links: LinkWithTags[]; totalCount: number }

/** Structural-only pagination -- no free-text search, no alphabetical sort (impossible against ciphertext). */
export async function getLinksPage(
  params: LinkFilterParams,
  limit: number,
  offset: number,
  dek: CryptoKey,
): Promise<LinksPage> {
  const supabase = createClient()

  const { data, error } = await supabase
    .rpc('search_links', {
      ...toRpcFilterArgs(params),
      p_sort_by: params.sortBy === 'alphabetical' ? 'newest' : params.sortBy,
      p_limit: limit,
      p_offset: offset,
    })
    .returns<Array<LinkRow & { tags: string[]; total_count: number }>>()

  if (error || !data) return { links: [], totalCount: 0 }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to omit it from `row`
  const links = await Promise.all(data.map(({ tags, total_count, ...row }) => toLinkWithTags(row, tags, dek)))
  return { links, totalCount: data[0]?.total_count ?? 0 }
}

export type MatchingLinkIds = { ids: string[]; totalCount: number }

/** Ids-only, matching only structural filters -- used for "select all matching" and client-side search/sort. */
export async function getMatchingLinkIds(params: LinkFilterParams): Promise<MatchingLinkIds> {
  const supabase = createClient()

  const { data, error } = await supabase
    .rpc('search_link_ids', {
      ...toRpcFilterArgs(params),
      p_limit: SELECT_ALL_MATCHING_CAP,
    })
    .returns<{ id: string; total_count: number }[]>()

  if (error || !data) return { ids: [], totalCount: 0 }

  return {
    ids: data.map(row => row.id),
    totalCount: data[0]?.total_count ?? 0,
  }
}

export async function deleteLink(id: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase
    .from('links')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  return !error
}

export async function bulkUpdateStatus(ids: string[], status: LinkStatus): Promise<boolean> {
  if (!ids.length) return true
  const supabase = createClient()
  const { error } = await supabase.from('links').update({ status }).in('id', ids)
  return !error
}

export async function bulkSoftDelete(ids: string[]): Promise<boolean> {
  if (!ids.length) return true
  const supabase = createClient()
  const { error } = await supabase
    .from('links')
    .update({ deleted_at: new Date().toISOString() })
    .in('id', ids)
  return !error
}

export async function bulkUpdateCategory(ids: string[], categoryId: string | null): Promise<boolean> {
  if (!ids.length) return true
  const supabase = createClient()
  const { error } = await supabase.from('links').update({ category_id: categoryId }).in('id', ids)
  return !error
}

/** Returns the resolved tag ids on success (so callers can patch already-loaded links), or null on failure. */
export async function bulkAddTags(ids: string[], tagNames: string[], dek: CryptoKey): Promise<string[] | null> {
  if (!ids.length || !tagNames.length) return []
  const supabase = createClient()

  const tagIds = await syncTagsByName(tagNames.filter(Boolean), dek)
  if (!tagIds.length) return null

  const pairs = ids.flatMap(link_id => tagIds.map(tag_id => ({ link_id, tag_id })))
  const { error } = await supabase
    .from('link_tags')
    .upsert(pairs, { onConflict: 'link_id,tag_id', ignoreDuplicates: true })

  return error ? null : tagIds
}

export type ImportLinkInput = {
  url: string
  title?: string | null
  notes?: string | null
  tags?: string[]
  category_id?: string | null
}

export type ImportResult = { imported: number; skipped: number; duplicates: number }

export async function importLinks(
  inputs: ImportLinkInput[],
  defaultCategoryId: string | null,
  dek: CryptoKey,
): Promise<ImportResult> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { imported: 0, skipped: inputs.length, duplicates: 0 }

  let imported = 0
  let skipped = 0
  let duplicates = 0

  for (const input of inputs) {
    if (!input.url.trim() || !isValidUrl(input.url)) {
      skipped++
      continue
    }

    const trimmedUrl = input.url.trim()
    const url_fingerprint = await hmacFingerprint(trimmedUrl, dek)

    const { data: existingRows } = await supabase
      .from('links')
      .select('id')
      .eq('user_id', user.id)
      .eq('url_fingerprint', url_fingerprint)
      .is('deleted_at', null)
      .limit(1)

    if (existingRows && existingRows.length > 0) {
      duplicates++
      continue
    }

    const category_id = input.category_id ?? defaultCategoryId
    const content: LinkContent = {
      url: trimmedUrl,
      title: input.title ?? null,
      description: null,
      site_name: new URL(trimmedUrl).hostname,
      image_url: null,
      duration: null,
      notes: input.notes ?? null,
    }
    const encoded = await toEncryptedColumns<LinkContent>(content, dek)

    const { data: link, error } = await supabase
      .from('links')
      .insert({
        user_id: user.id,
        ...encoded,
        url_fingerprint,
        category_id,
        status: 'unread',
      })
      .select()
      .single()

    if (error || !link) {
      skipped++
      continue
    }

    const tagIds = await syncTagsByName(input.tags?.filter(Boolean) ?? [], dek)
    await insertLinkTags(link.id, tagIds)
    imported++
  }

  return { imported, skipped, duplicates }
}
