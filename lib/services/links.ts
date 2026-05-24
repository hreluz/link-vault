import { createClient } from '@/lib/supabase/client'
import type { ContentType, LinkStatus, Tables } from '@/lib/types/database'

export type LinkWithTags = Tables<'links'> & { tags: string[] }

type LinkQueryRow = Tables<'links'> & {
  link_tags: Array<{ tags: { name: string } | null }>
}

export type CreateLinkInput = {
  url: string
  title?: string | null
  content_type: ContentType
  status: LinkStatus
  notes?: string | null
  tags: string[]
}

export async function createLink(input: CreateLinkInput): Promise<LinkWithTags | null> {
  if (!input.url.trim()) return null

  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: link, error } = await supabase
    .from('links')
    .insert({
      user_id: user.id,
      url: input.url,
      title: input.title ?? null,
      content_type: input.content_type,
      status: input.status,
      notes: input.notes ?? null,
    })
    .select()
    .single()

  if (error || !link) return null

  const tagNames = input.tags.filter(Boolean)
  if (tagNames.length === 0) return { ...link, tags: [] }

  await supabase
    .from('tags')
    .upsert(
      tagNames.map(name => ({ user_id: user.id, name })),
      { onConflict: 'user_id,name', ignoreDuplicates: true },
    )

  const { data: tagRows } = await supabase
    .from('tags')
    .select('id, name')
    .eq('user_id', user.id)
    .in('name', tagNames)

  if (!tagRows?.length) return { ...link, tags: [] }

  await supabase
    .from('link_tags')
    .insert(tagRows.map(tag => ({ link_id: link.id, tag_id: tag.id })))

  return { ...link, tags: tagRows.map(t => t.name) }
}

export type UpdateLinkInput = {
  id: string
  url: string
  title?: string | null
  description?: string | null
  content_type: ContentType
  status: LinkStatus
  notes?: string | null
  tags: string[]
}

export async function updateLink(input: UpdateLinkInput): Promise<LinkWithTags | null> {
  if (!input.url.trim()) return null

  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: link, error } = await supabase
    .from('links')
    .update({
      url: input.url,
      title: input.title ?? null,
      description: input.description ?? null,
      content_type: input.content_type,
      status: input.status,
      notes: input.notes ?? null,
    })
    .eq('id', input.id)
    .select()
    .single()

  if (error || !link) return null

  await supabase.from('link_tags').delete().eq('link_id', input.id)

  const tagNames = input.tags.filter(Boolean)
  if (tagNames.length === 0) return { ...link, tags: [] }

  await supabase
    .from('tags')
    .upsert(
      tagNames.map(name => ({ user_id: user.id, name })),
      { onConflict: 'user_id,name', ignoreDuplicates: true },
    )

  const { data: tagRows } = await supabase
    .from('tags')
    .select('id, name')
    .eq('user_id', user.id)
    .in('name', tagNames)

  if (!tagRows?.length) return { ...link, tags: [] }

  await supabase
    .from('link_tags')
    .insert(tagRows.map(tag => ({ link_id: link.id, tag_id: tag.id })))

  return { ...link, tags: tagRows.map(t => t.name) }
}

export async function getLinks(): Promise<LinkWithTags[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('links')
    .select('*, link_tags(tags(name))')
    .order('created_at', { ascending: false })
    .returns<LinkQueryRow[]>()

  if (error || !data) return []

  return data.map(({ link_tags, ...link }) => ({
    ...link,
    tags: link_tags.flatMap(lt => lt.tags?.name ? [lt.tags.name] : []),
  }))
}
