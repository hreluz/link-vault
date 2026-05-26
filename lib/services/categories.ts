import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Tables } from '@/lib/types/database'

export type Category = Tables<'categories'>

export type DefaultCategory = {
  name: string
  description: string
  color: string
  emoticon: string
}

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { name: 'YouTube',   description: 'Videos and tutorials',       color: '#FF0000', emoticon: '📺' },
  { name: 'Instagram', description: 'Photos, reels and stories',  color: '#E1306C', emoticon: '📸' },
  { name: 'TikTok',    description: 'Short-form videos',          color: '#69C9D0', emoticon: '🎵' },
  { name: 'Article',   description: 'Blog posts and articles',    color: '#3B82F6', emoticon: '📄' },
  { name: 'Course',    description: 'Courses and documentation',  color: '#8B5CF6', emoticon: '🎓' },
  { name: 'Tweet',     description: 'Posts from X / Twitter',     color: '#1D9BF0', emoticon: '🐦' },
  { name: 'GitHub',    description: 'Repositories and code',      color: '#24292E', emoticon: '💻' },
  { name: 'Other',     description: 'Everything else',            color: '#6B7280', emoticon: '🔗' },
]

export async function getCategories(): Promise<Category[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true })

  if (error || !data) return []
  return data
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

export async function createCategory(input: CreateCategoryInput): Promise<CreateCategoryResult> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'unauthenticated' }

  const { data: existing } = await supabase
    .from('categories')
    .select('id')
    .eq('user_id', user.id)
    .ilike('name', input.name.trim())
    .maybeSingle()

  if (existing) return { data: null, error: 'name_taken' }

  const { data, error } = await supabase
    .from('categories')
    .insert({ user_id: user.id, name: input.name, emoticon: input.emoticon ?? null, color: input.color ?? null, description: input.description ?? null })
    .select()
    .single()

  if (error || !data) return { data: null, error: 'db_error' }
  return { data, error: null }
}

export type UpdateCategoryInput = {
  id: string
  name: string
  emoticon?: string | null
  color?: string | null
  description?: string | null
}

export async function updateCategory(input: UpdateCategoryInput): Promise<Category | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('categories')
    .update({ name: input.name, emoticon: input.emoticon ?? null, color: input.color ?? null, description: input.description ?? null })
    .eq('id', input.id)
    .select()
    .single()

  if (error || !data) return null
  return data
}

export async function deleteCategory(id: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase.from('categories').delete().eq('id', id)
  return !error
}

export async function seedDefaultCategories(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<void> {
  const { count, error } = await supabase
    .from('categories')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (error || count === null || count > 0) return

  await supabase
    .from('categories')
    .insert(DEFAULT_CATEGORIES.map(cat => ({ ...cat, user_id: userId })))
}
