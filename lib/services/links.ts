import { createClient } from '@/lib/supabase/client'
import type { LinkStatus, Tables } from '@/lib/types/database'
import type { SortBy } from '@/app/dashboard/link/FilterSheet'

export type LinkWithTags = Tables<'links'> & { tags: string[] }

export type LinkFilterParams = {
  search: string
  categoryId: string | null
  statuses: LinkStatus[]
  tagNames: string[]
  tagMode: 'any' | 'all'
  favoritesOnly: boolean
  sortBy: SortBy
  unlockedTagNames: string[]
}

export const SELECT_ALL_MATCHING_CAP = 2000

type LinkQueryRow = Tables<'links'> & {
  link_tags: Array<{ tags: { name: string } | null }>
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

type SupabaseClient = ReturnType<typeof createClient>

async function syncTags(supabase: SupabaseClient, userId: string, linkId: string, tags: string[]): Promise<string[]> {
  const names = tags.length > 0 ? tags : ['no-tag']

  await supabase
    .from('tags')
    .upsert(
      names.map(name => ({ user_id: userId, name })),
      { onConflict: 'user_id,name', ignoreDuplicates: true },
    )

  const { data: tagRows } = await supabase
    .from('tags')
    .select('id, name')
    .eq('user_id', userId)
    .in('name', names)

  if (!tagRows?.length) return []

  await supabase
    .from('link_tags')
    .insert(tagRows.map(tag => ({ link_id: linkId, tag_id: tag.id })))

  return tagRows.map(t => t.name)
}

export async function createLink(input: CreateLinkInput): Promise<LinkWithTags | null> {
  if (!input.url.trim() || !isValidUrl(input.url)) return null
  if (!input.category_id) return null

  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const site_name = new URL(input.url).hostname

  const { data: link, error } = await supabase
    .from('links')
    .insert({
      user_id: user.id,
      url: input.url,
      title: input.title ?? null,
      description: input.description ?? null,
      image_url: input.image_url ?? null,
      duration: input.duration ?? null,
      site_name,
      category_id: input.category_id ?? null,
      status: input.status,
      notes: input.notes ?? null,
    })
    .select()
    .single()

  if (error || !link) return null

  const tags = await syncTags(supabase, user.id, link.id, input.tags.filter(Boolean))
  return { ...link, tags }
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

export async function updateLink(input: UpdateLinkInput): Promise<LinkWithTags | null> {
  if (!input.url.trim() || !isValidUrl(input.url)) return null
  if (!input.category_id) return null

  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: link, error } = await supabase
    .from('links')
    .update({
      url: input.url,
      title: input.title ?? null,
      description: input.description ?? null,
      image_url: input.image_url ?? null,
      duration: input.duration ?? null,
      category_id: input.category_id ?? null,
      status: input.status,
      notes: input.notes ?? null,
    })
    .eq('id', input.id)
    .select()
    .single()

  if (error || !link) return null

  await supabase.from('link_tags').delete().eq('link_id', input.id)

  const tags = await syncTags(supabase, user.id, link.id, input.tags.filter(Boolean))
  return { ...link, tags }
}

export async function getLinks(): Promise<LinkWithTags[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('links')
    .select('*, link_tags(tags(name))')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .returns<LinkQueryRow[]>()

  if (error || !data) return []

  return data.map(({ link_tags, ...link }) => ({
    ...link,
    tags: link_tags.flatMap(lt => lt.tags?.name ? [lt.tags.name] : []),
  }))
}

function toRpcFilterArgs(params: LinkFilterParams) {
  return {
    p_search: params.search || null,
    p_category_id: params.categoryId,
    p_statuses: params.statuses.length ? params.statuses : null,
    p_tag_names: params.tagNames.length ? params.tagNames : null,
    p_tag_mode: params.tagMode,
    p_favorites_only: params.favoritesOnly,
    p_unlocked_tag_names: params.unlockedTagNames.length ? params.unlockedTagNames : null,
  }
}

export type LinksPage = { links: LinkWithTags[]; totalCount: number }

export async function getLinksPage(
  params: LinkFilterParams,
  limit: number,
  offset: number,
): Promise<LinksPage> {
  const supabase = createClient()

  const { data, error } = await supabase
    .rpc('search_links', {
      ...toRpcFilterArgs(params),
      p_sort_by: params.sortBy,
      p_limit: limit,
      p_offset: offset,
    })
    .returns<(LinkWithTags & { total_count: number })[]>()

  if (error || !data) return { links: [], totalCount: 0 }

  return {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to omit it from `link`
    links: data.map(({ total_count, ...link }) => link),
    totalCount: data[0]?.total_count ?? 0,
  }
}

export type MatchingLinkIds = { ids: string[]; totalCount: number }

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

export async function bulkAddTags(ids: string[], tagNames: string[]): Promise<boolean> {
  if (!ids.length || !tagNames.length) return true
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const names = tagNames.filter(Boolean)

  await supabase
    .from('tags')
    .upsert(
      names.map(name => ({ user_id: user.id, name })),
      { onConflict: 'user_id,name', ignoreDuplicates: true },
    )

  const { data: tagRows } = await supabase
    .from('tags')
    .select('id')
    .eq('user_id', user.id)
    .in('name', names)

  if (!tagRows?.length) return false

  const pairs = ids.flatMap(link_id => tagRows.map(tag => ({ link_id, tag_id: tag.id })))
  const { error } = await supabase
    .from('link_tags')
    .upsert(pairs, { onConflict: 'link_id,tag_id', ignoreDuplicates: true })

  return !error
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

    const { data: existingRows } = await supabase
      .from('links')
      .select('id')
      .eq('user_id', user.id)
      .eq('url', trimmedUrl)
      .is('deleted_at', null)
      .limit(1)

    if (existingRows && existingRows.length > 0) {
      duplicates++
      continue
    }

    const site_name = new URL(trimmedUrl).hostname
    const category_id = input.category_id ?? defaultCategoryId

    const { data: link, error } = await supabase
      .from('links')
      .insert({
        user_id: user.id,
        url: trimmedUrl,
        title: input.title ?? null,
        site_name,
        category_id,
        status: 'unread',
        notes: input.notes ?? null,
      })
      .select()
      .single()

    if (error || !link) {
      skipped++
      continue
    }

    await syncTags(supabase, user.id, link.id, input.tags?.filter(Boolean) ?? [])
    imported++
  }

  return { imported, skipped, duplicates }
}
