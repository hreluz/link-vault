import { createClient } from '@/lib/supabase/client'
import type { CategoryDomain } from '@/lib/types/database'

export type { CategoryDomain }

export type AddCategoryDomainResult =
  | { data: CategoryDomain; error: null }
  | { data: null; error: 'domain_taken' | 'invalid_domain' | 'unauthenticated' | 'db_error' }

function normalizeDomain(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase().replace(/^www\./, '')
  if (!trimmed || trimmed.includes(' ') || !trimmed.includes('.')) return null
  return trimmed
}

export async function getCategoryDomains(categoryId: string): Promise<CategoryDomain[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('category_domains')
    .select('*')
    .eq('category_id', categoryId)
    .order('domain', { ascending: true })

  if (error || !data) return []
  return data
}

export async function addCategoryDomain(
  categoryId: string,
  rawDomain: string,
): Promise<AddCategoryDomainResult> {
  const domain = normalizeDomain(rawDomain)
  if (!domain) return { data: null, error: 'invalid_domain' }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'unauthenticated' }

  const { data, error } = await supabase
    .from('category_domains')
    .insert({ category_id: categoryId, user_id: user.id, domain })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return { data: null, error: 'domain_taken' }
    return { data: null, error: 'db_error' }
  }

  return { data, error: null }
}

export async function removeCategoryDomain(id: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase.from('category_domains').delete().eq('id', id)
  return !error
}

export async function getCategoryIdByDomain(hostname: string): Promise<string | null> {
  const domain = normalizeDomain(hostname)
  if (!domain) return null

  const supabase = createClient()
  const { data } = await supabase
    .from('category_domains')
    .select('category_id')
    .eq('domain', domain)
    .maybeSingle()

  return data?.category_id ?? null
}
