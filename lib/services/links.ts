import { createClient } from '@/lib/supabase/client'
import type { Tables } from '@/lib/types/database'

export type LinkWithTags = Tables<'links'> & { tags: string[] }

type LinkQueryRow = Tables<'links'> & {
  link_tags: Array<{ tags: { name: string } | null }>
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
