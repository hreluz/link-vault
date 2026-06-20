import { createClient } from '@/lib/supabase/client'
import type { LinkStatus, Tables } from '@/lib/types/database'

export type LinkWithTags = Tables<'links'> & { tags: string[] }

type LinkQueryRow = Tables<'links'> & {
  link_tags: Array<{ tags: { name: string } | null }>
}

export type CreateLinkInput = {
  url: string
  title?: string | null
  description?: string | null
  image_url?: string | null
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

export async function deleteLink(id: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase
    .from('links')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
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
