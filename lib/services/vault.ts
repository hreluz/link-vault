import { createClient } from '@/lib/supabase/client'

export type VaultKeyRow = {
  salt: string
  wrapped_dek: string
  wrapped_dek_iv: string
  kdf_iterations: number
}

export async function getVaultKeyRow(userId: string): Promise<VaultKeyRow | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from('user_encryption_keys')
    .select('salt, wrapped_dek, wrapped_dek_iv, kdf_iterations')
    .eq('user_id', userId)
    .maybeSingle()
  return data
}

export type CreateVaultKeyInput = {
  salt: string
  wrappedDek: string
  wrappedDekIv: string
  kdfIterations: number
}

export async function createVaultKeyRow(userId: string, input: CreateVaultKeyInput): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase.from('user_encryption_keys').insert({
    user_id: userId,
    salt: input.salt,
    wrapped_dek: input.wrappedDek,
    wrapped_dek_iv: input.wrappedDekIv,
    kdf_iterations: input.kdfIterations,
  })
  return !error
}

export type UpdateVaultKeyInput = {
  salt: string
  wrappedDek: string
  wrappedDekIv: string
}

export async function updateVaultKeyRow(userId: string, input: UpdateVaultKeyInput): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase
    .from('user_encryption_keys')
    .update({
      salt: input.salt,
      wrapped_dek: input.wrappedDek,
      wrapped_dek_iv: input.wrappedDekIv,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
  return !error
}

/**
 * Deletes every row encrypted with this user's DEK, then the vault key row
 * itself. Used by the "restart account" flow: a forgotten password means the
 * old DEK is unrecoverable, so its ciphertext is permanently useless. Order
 * follows FK cascades (links -> link_tags, categories -> category_domains) so
 * nothing is left orphaned.
 */
export async function wipeVaultData(userId: string): Promise<boolean> {
  const supabase = createClient()

  const { error: linksError } = await supabase.from('links').delete().eq('user_id', userId)
  if (linksError) return false

  const { error: tagsError } = await supabase.from('tags').delete().eq('user_id', userId)
  if (tagsError) return false

  const { error: categoriesError } = await supabase.from('categories').delete().eq('user_id', userId)
  if (categoriesError) return false

  const { error: keyError } = await supabase.from('user_encryption_keys').delete().eq('user_id', userId)
  return !keyError
}
