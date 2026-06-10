import { createClient } from '@/lib/supabase/client'
import type { Tables } from '@/lib/types/database'

export type TrashedLink = Tables<'links'> & { tags: string[] }

type LinkQueryRow = Tables<'links'> & {
  link_tags: Array<{ tags: { name: string } | null }>
}

export async function getTrashedLinks(): Promise<TrashedLink[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('links')
    .select('*, link_tags(tags(name))')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })
    .returns<LinkQueryRow[]>()

  if (error || !data) return []

  return data.map(({ link_tags, ...link }) => ({
    ...link,
    tags: link_tags.flatMap(lt => lt.tags?.name ? [lt.tags.name] : []),
  }))
}

export async function restoreLink(id: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase
    .from('links')
    .update({ deleted_at: null })
    .eq('id', id)
  return !error
}

export async function deleteLinkPermanently(id: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase
    .from('links')
    .delete()
    .eq('id', id)
  return !error
}

export async function emptyTrash(): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { error } = await supabase
    .from('links')
    .delete()
    .eq('user_id', user.id)
    .not('deleted_at', 'is', null)
  return !error
}
