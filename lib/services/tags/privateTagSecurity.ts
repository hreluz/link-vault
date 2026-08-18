import { createClient } from '@/lib/supabase/client'

async function hashPassword(password: string): Promise<string> {
  const encoded = new TextEncoder().encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

// --- Global private tag password ---

export async function setPrivateTagPassword(
  password: string,
  hint: string,
): Promise<'ok' | 'unauthenticated' | 'db_error'> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 'unauthenticated'

  const password_hash = await hashPassword(password)

  const { error } = await supabase
    .from('private_tag_settings')
    .upsert(
      { user_id: user.id, password_hash, hint: hint.trim() || null, failed_attempts: 0, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    )

  return error ? 'db_error' : 'ok'
}

export type VerifyPasswordResult =
  | { ok: true }
  | { ok: false; nuked: false; attemptsLeft: number }
  | { ok: false; nuked: true }

export async function verifyPrivateTagPassword(password: string): Promise<VerifyPasswordResult> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, nuked: false, attemptsLeft: 5 }

  const { data } = await supabase
    .from('private_tag_settings')
    .select('password_hash, failed_attempts')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!data?.password_hash) return { ok: false, nuked: false, attemptsLeft: 5 }

  const hash = await hashPassword(password)

  if (hash === data.password_hash) {
    await supabase
      .from('private_tag_settings')
      .update({ failed_attempts: 0 })
      .eq('user_id', user.id)
    return { ok: true }
  }

  const newCount = (data.failed_attempts ?? 0) + 1
  await supabase
    .from('private_tag_settings')
    .update({ failed_attempts: newCount })
    .eq('user_id', user.id)

  if (newCount >= 5) {
    await nukeAllData(user.id)
    return { ok: false, nuked: true }
  }

  return { ok: false, nuked: false, attemptsLeft: 5 - newCount }
}

async function nukeAllData(userId: string): Promise<void> {
  const supabase = createClient()

  const { data: privateTags } = await supabase
    .from('tags')
    .select('id')
    .eq('user_id', userId)
    .eq('is_private', true)

  if (privateTags && privateTags.length > 0) {
    const privateTagIds = privateTags.map(t => t.id)

    const { data: linkTagRows } = await supabase
      .from('link_tags')
      .select('link_id')
      .in('tag_id', privateTagIds)

    if (linkTagRows && linkTagRows.length > 0) {
      const linkIds = [...new Set(linkTagRows.map(r => r.link_id))]
      await supabase.from('links').delete().in('id', linkIds)
    }

    await supabase.from('tags').delete().in('id', privateTagIds)
  }

  await supabase.from('private_tag_settings').delete().eq('user_id', userId)
}

export async function getPrivateTagSettings(): Promise<{ hint: string | null; hasPassword: boolean }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { hint: null, hasPassword: false }

  const { data } = await supabase
    .from('private_tag_settings')
    .select('hint, password_hash')
    .eq('user_id', user.id)
    .maybeSingle()

  return {
    hint: data?.hint ?? null,
    hasPassword: !!data?.password_hash,
  }
}
