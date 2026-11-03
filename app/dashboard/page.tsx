import { createClient } from '@/lib/supabase/server'
import { getAutoFetchPreference, getMoveToEndDelay } from '@/lib/services/userPreferences'
import LinkList from './link/LinkList'

export const metadata = {
  title: 'Dashboard — Link Vault',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const [autoFetchDefault, moveToEndDelaySeconds] = await Promise.all([
    getAutoFetchPreference(supabase),
    getMoveToEndDelay(supabase),
  ])

  return <LinkList autoFetchDefault={autoFetchDefault} moveToEndDelaySeconds={moveToEndDelaySeconds} />
}
