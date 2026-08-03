import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getAutoFetchPreference } from '@/lib/services/userPreferences'
import LinkPreferencesForm from './LinkPreferencesForm'

export const metadata: Metadata = { title: 'Link Preferences — Link Vault' }

export default async function LinkPreferencesPage() {
  const supabase = await createClient()
  const autoFetchEnabled = await getAutoFetchPreference(supabase)

  return <LinkPreferencesForm initialAutoFetchEnabled={autoFetchEnabled} />
}
