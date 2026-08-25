import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'
import { toEncryptedColumns, fromEncryptedColumns } from '@/lib/crypto/encryptedRow'

export type Category = {
  id: string
  user_id: string
  name: string
  description: string | null
  color: string | null
  emoticon: string | null
  created_at: string
  updated_at: string
}

type CategoryPayload = {
  name: string
  description: string | null
  color: string | null
  emoticon: string | null
}

type CategoryRow = {
  id: string
  user_id: string
  enc_payload: string
  enc_iv: string
  created_at: string
  updated_at: string
}

function decryptRow(row: CategoryRow, dek: CryptoKey): Promise<Category> {
  return fromEncryptedColumns<CategoryPayload, CategoryRow>(row, dek)
}

export type DefaultCategory = {
  name: string
  description: string
  color: string
  emoticon: string
}

export const PROTECTED_CATEGORY_NAME = 'Not defined'

export const SEED_CATEGORIES: DefaultCategory[] = [
  { name: PROTECTED_CATEGORY_NAME, description: 'Uncategorized links',        color: '#94A3B8', emoticon: '🔖' },
  { name: 'YouTube',               description: 'Videos and tutorials',       color: '#FF0000', emoticon: '📺' },
  { name: 'Instagram',             description: 'Photos, reels and stories',  color: '#E1306C', emoticon: '📸' },
  { name: 'TikTok',                description: 'Short-form videos',          color: '#69C9D0', emoticon: '🎵' },
  { name: 'Article',               description: 'Blog posts and articles',    color: '#3B82F6', emoticon: '📄' },
  { name: 'Course',                description: 'Courses and documentation',  color: '#8B5CF6', emoticon: '🎓' },
  { name: 'Tweet',                 description: 'Posts from X / Twitter',     color: '#1D9BF0', emoticon: '🐦' },
  { name: 'GitHub',                description: 'Repositories and code',      color: '#24292E', emoticon: '💻' },
  { name: 'Other',                 description: 'Everything else',            color: '#6B7280', emoticon: '🔗' },
]

const SEED_DOMAINS: Record<string, string[]> = {
  'YouTube':   ['youtube.com', 'youtu.be'],
  'Instagram': ['instagram.com'],
  'TikTok':    ['tiktok.com', 'vm.tiktok.com'],
  'Tweet':     ['twitter.com', 'x.com', 't.co'],
  'GitHub':    ['github.com'],
}

export async function getCategories(dek: CryptoKey): Promise<Category[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('categories')
    .select('*')

  if (error || !data) return []

  const categories = await Promise.all(data.map(row => decryptRow(row, dek)))
  return categories.sort((a, b) => a.name.localeCompare(b.name))
}

export type CreateCategoryInput = {
  name: string
  emoticon?: string | null
  color?: string | null
  description?: string | null
}

export type CreateCategoryResult =
  | { data: Category; error: null }
  | { data: null; error: 'name_taken' | 'unauthenticated' | 'db_error' }

export async function createCategory(input: CreateCategoryInput, dek: CryptoKey): Promise<CreateCategoryResult> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'unauthenticated' }

  const name = input.name.trim()
  const existing = await getCategories(dek)
  if (existing.some(c => c.name.toLowerCase() === name.toLowerCase())) {
    return { data: null, error: 'name_taken' }
  }

  const encoded = await toEncryptedColumns<CategoryPayload>(
    { name, description: input.description ?? null, color: input.color ?? null, emoticon: input.emoticon ?? null },
    dek,
  )

  const { data, error } = await supabase
    .from('categories')
    .insert({ user_id: user.id, ...encoded })
    .select()
    .single()

  if (error || !data) return { data: null, error: 'db_error' }
  return { data: await decryptRow(data, dek), error: null }
}

export type UpdateCategoryInput = {
  id: string
  name: string
  emoticon?: string | null
  color?: string | null
  description?: string | null
}

export type UpdateCategoryResult =
  | { data: Category; error: null }
  | { data: null; error: 'name_taken' | 'unauthenticated' | 'db_error' }

export async function updateCategory(input: UpdateCategoryInput, dek: CryptoKey): Promise<UpdateCategoryResult> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'unauthenticated' }

  const name = input.name.trim()
  const existing = await getCategories(dek)
  if (existing.some(c => c.id !== input.id && c.name.toLowerCase() === name.toLowerCase())) {
    return { data: null, error: 'name_taken' }
  }

  const encoded = await toEncryptedColumns<CategoryPayload>(
    { name, description: input.description ?? null, color: input.color ?? null, emoticon: input.emoticon ?? null },
    dek,
  )

  const { data, error } = await supabase
    .from('categories')
    .update(encoded)
    .eq('id', input.id)
    .select()
    .single()

  if (error || !data) return { data: null, error: 'db_error' }
  return { data: await decryptRow(data, dek), error: null }
}

export async function getCategoryLinksCount(id: string): Promise<number> {
  const supabase = createClient()
  const { count } = await supabase
    .from('links')
    .select('*', { count: 'exact', head: true })
    .eq('category_id', id)
  return count ?? 0
}

export async function deleteCategory(id: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase.from('categories').delete().eq('id', id)
  return !error
}

export type CategoryStyle = { description?: string | null; color?: string | null; emoticon?: string | null }

/** Looks up a category by name, creating it (with the given style, if any) only when no match exists.
 *  An existing category's own style is never overwritten by a name match. */
export async function getOrCreateCategoryByName(
  name: string,
  dek: CryptoKey,
  style?: CategoryStyle,
): Promise<string | null> {
  const trimmedName = name.trim()
  if (!trimmedName) return null

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const existing = await getCategories(dek)
  const match = existing.find(c => c.name.toLowerCase() === trimmedName.toLowerCase())
  if (match) return match.id

  const encoded = await toEncryptedColumns<CategoryPayload>(
    {
      name: trimmedName,
      description: style?.description ?? null,
      color: style?.color ?? null,
      emoticon: style?.emoticon ?? null,
    },
    dek,
  )

  const { data: created, error } = await supabase
    .from('categories')
    .insert({ user_id: user.id, ...encoded })
    .select()
    .single()

  if (error || !created) return null
  return created.id
}

export async function seedDefaultCategories(
  supabase: SupabaseClient<Database>,
  userId: string,
  dek: CryptoKey,
): Promise<void> {
  const { count, error } = await supabase
    .from('categories')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (error || count === null || count > 0) return

  const categoryRows = await Promise.all(SEED_CATEGORIES.map(async cat => {
    const encoded = await toEncryptedColumns<CategoryPayload>(cat, dek)
    return { user_id: userId, ...encoded }
  }))

  const { data: inserted } = await supabase
    .from('categories')
    .insert(categoryRows)
    .select()

  if (!inserted) return

  // Insertion order matches SEED_CATEGORIES order, so index back into it for domain lookup.
  const domainRows = await Promise.all(
    inserted.flatMap((cat, index) => {
      const domains = SEED_DOMAINS[SEED_CATEGORIES[index].name] ?? []
      return domains.map(async domain => {
        const encoded = await toEncryptedColumns({ domain }, dek)
        return { category_id: cat.id, user_id: userId, ...encoded }
      })
    }),
  )

  if (domainRows.length > 0) {
    await supabase.from('category_domains').insert(domainRows)
  }
}
