import { createClient } from '@/lib/supabase/client'
import { fromEncryptedColumns } from '@/lib/crypto/encryptedRow'
import type { LinkContent, LinkWithTags } from '@/lib/services/links'
import type { LinkStatus } from '@/lib/types/database'

export type TrashedLink = LinkWithTags

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

export async function getTrashedLinks(dek: CryptoKey): Promise<TrashedLink[]> {
  const supabase = createClient()

  const { data: rawData, error } = await supabase
    .from('links')
    .select('*, link_tags(tag_id)')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })

  const data = rawData as unknown as LinkQueryRow[] | null
  if (error || !data) return []

  return Promise.all(data.map(async ({ link_tags, ...row }) => {
    const link = await fromEncryptedColumns<LinkContent, LinkRow>(row, dek)
    return { ...link, tags: link_tags.map(lt => lt.tag_id) }
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
