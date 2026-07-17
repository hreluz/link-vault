import { createClient } from '@/lib/supabase/client'
import { toEncryptedColumns, fromEncryptedColumns } from '@/lib/crypto/encryptedRow'

export type CategoryDomain = {
  id: string
  category_id: string
  user_id: string
  domain: string
  created_at: string
}

type DomainPayload = { domain: string }

type CategoryDomainRow = {
  id: string
  category_id: string
  user_id: string
  enc_payload: string
  enc_iv: string
  created_at: string
}

function decryptRow(row: CategoryDomainRow, dek: CryptoKey): Promise<CategoryDomain> {
  return fromEncryptedColumns<DomainPayload, CategoryDomainRow>(row, dek)
}

export type AddCategoryDomainResult =
  | { data: CategoryDomain; error: null }
  | { data: null; error: 'domain_taken' | 'invalid_domain' | 'unauthenticated' | 'db_error' }

function normalizeDomain(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase()
  if (!trimmed || trimmed.includes(' ')) return null

  let hostname: string
  try {
    const withScheme = /^[a-z][a-z0-9+.-]*:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`
    hostname = new URL(withScheme).hostname
  } catch {
    return null
  }

  hostname = hostname.replace(/^www\./, '')
  if (!hostname || !hostname.includes('.')) return null
  return hostname
}

export async function getCategoryDomains(categoryId: string, dek: CryptoKey): Promise<CategoryDomain[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('category_domains')
    .select('*')
    .eq('category_id', categoryId)

  if (error || !data) return []

  const domains = await Promise.all(data.map(row => decryptRow(row, dek)))
  return domains.sort((a, b) => a.domain.localeCompare(b.domain))
}

export async function addCategoryDomain(
  categoryId: string,
  rawDomain: string,
  dek: CryptoKey,
): Promise<AddCategoryDomainResult> {
  const domain = normalizeDomain(rawDomain)
  if (!domain) return { data: null, error: 'invalid_domain' }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'unauthenticated' }

  // No DB-level unique constraint is possible on an encrypted domain, so
  // uniqueness is checked by decrypting the user's existing domains in JS
  // (this table is always small -- see ENCRYPTION.md).
  const { data: existingRows } = await supabase
    .from('category_domains')
    .select('*')
    .eq('user_id', user.id)

  if (existingRows) {
    const existing = await Promise.all(existingRows.map(row => decryptRow(row, dek)))
    if (existing.some(d => normalizeDomain(d.domain) === domain)) return { data: null, error: 'domain_taken' }
  }

  const encoded = await toEncryptedColumns<DomainPayload>({ domain }, dek)

  const { data, error } = await supabase
    .from('category_domains')
    .insert({ category_id: categoryId, user_id: user.id, ...encoded })
    .select()
    .single()

  if (error || !data) return { data: null, error: 'db_error' }

  return { data: await decryptRow(data, dek), error: null }
}

export async function removeCategoryDomain(id: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase.from('category_domains').delete().eq('id', id)
  return !error
}

export async function getCategoryIdByDomain(hostname: string, dek: CryptoKey): Promise<string | null> {
  const domain = normalizeDomain(hostname)
  if (!domain) return null

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('category_domains')
    .select('*')
    .eq('user_id', user.id)

  if (!data) return null

  for (const row of data) {
    const decrypted = await decryptRow(row, dek)
    if (normalizeDomain(decrypted.domain) === domain) return decrypted.category_id
  }
  return null
}
