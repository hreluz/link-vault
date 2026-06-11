import { createClient } from '@/lib/supabase/client'
import type { Tables } from '@/lib/types/database'

export type Tag = Tables<'tags'>
export type TagWithCount = Tag & { link_count: number }

type RawTag = Tag & { link_tags: { id: string }[] }

export function toKebabCase(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function getTags(): Promise<TagWithCount[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('tags')
    .select('*, link_tags(id)')
    .order('name', { ascending: true })

  if (error || !data) return []

  return (data as RawTag[]).map(tag => ({
    id: tag.id,
    user_id: tag.user_id,
    name: tag.name,
    color: tag.color,
    created_at: tag.created_at,
    link_count: tag.link_tags.length,
  }))
}

export type CreateTagInput = {
  name: string
  color?: string | null
}

export type CreateTagResult =
  | { data: Tag; error: null }
  | { data: null; error: 'name_taken' | 'unauthenticated' | 'db_error' }

export async function createTag(input: CreateTagInput): Promise<CreateTagResult> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'unauthenticated' }

  const name = toKebabCase(input.name)
  if (!name) return { data: null, error: 'db_error' }

  const { data: existing } = await supabase
    .from('tags')
    .select('id')
    .eq('user_id', user.id)
    .ilike('name', name)
    .maybeSingle()

  if (existing) return { data: null, error: 'name_taken' }

  const { data, error } = await supabase
    .from('tags')
    .insert({ user_id: user.id, name, color: input.color ?? null })
    .select()
    .single()

  if (error || !data) return { data: null, error: 'db_error' }
  return { data, error: null }
}

export type UpdateTagInput = {
  id: string
  name: string
  color?: string | null
}

export type UpdateTagResult =
  | { data: Tag; error: null }
  | { data: null; error: 'name_taken' | 'unauthenticated' | 'db_error' }

export async function updateTag(input: UpdateTagInput): Promise<UpdateTagResult> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'unauthenticated' }

  const name = toKebabCase(input.name)
  if (!name) return { data: null, error: 'db_error' }

  const { data: existing } = await supabase
    .from('tags')
    .select('id')
    .eq('user_id', user.id)
    .ilike('name', name)
    .neq('id', input.id)
    .maybeSingle()

  if (existing) return { data: null, error: 'name_taken' }

  const { data, error } = await supabase
    .from('tags')
    .update({ name, color: input.color ?? null })
    .eq('id', input.id)
    .select()
    .single()

  if (error || !data) return { data: null, error: 'db_error' }
  return { data, error: null }
}

export async function getTagLinksCount(id: string): Promise<number> {
  const supabase = createClient()
  const { count } = await supabase
    .from('link_tags')
    .select('*', { count: 'exact', head: true })
    .eq('tag_id', id)
  return count ?? 0
}

export async function deleteTag(id: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase.from('tags').delete().eq('id', id)
  return !error
}
