import 'server-only'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'

/**
 * Service-role Supabase client. Bypasses RLS — use only for the narrow server-side
 * writes that no user policy allows (currently: promoting ADMIN_EMAIL in
 * `confirmSignup`). The `server-only` import makes any client-bundle import fail
 * the build, and the key has no `NEXT_PUBLIC_` prefix so it never reaches the browser.
 *
 * Throws if `SUPABASE_SERVICE_ROLE_KEY` is not set.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
