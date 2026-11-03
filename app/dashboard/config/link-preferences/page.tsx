import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getAutoFetchPreference, getMoveToEndDelay } from '@/lib/services/userPreferences'
import LinkPreferencesForm from './LinkPreferencesForm'

export const metadata: Metadata = { title: 'Link Preferences — Link Vault' }

export default async function LinkPreferencesPage() {
  const supabase = await createClient()
  const [autoFetchEnabled, moveToEndDelaySeconds] = await Promise.all([
    getAutoFetchPreference(supabase),
    getMoveToEndDelay(supabase),
  ])

  return (
    <LinkPreferencesForm
      initialAutoFetchEnabled={autoFetchEnabled}
      initialMoveToEndDelaySeconds={moveToEndDelaySeconds}
    />
  )
}
