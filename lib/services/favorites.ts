import { createClient } from '@/lib/supabase/client'
import type { LinkWithTags } from './links'

type LinkQueryRow = {
  link_tags: Array<{ tags: { name: string } | null }>
} & Omit<LinkWithTags, 'tags'>

export async function getFavorites(): Promise<LinkWithTags[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('links')
    .select('*, link_tags(tags(name))')
    .eq('is_favorite', true)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .returns<LinkQueryRow[]>()

  if (error || !data) return []

  return data.map(({ link_tags, ...link }) => ({
    ...link,
    tags: link_tags.flatMap(lt => lt.tags?.name ? [lt.tags.name] : []),
  }))
}
