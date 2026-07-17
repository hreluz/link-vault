import { createClient } from '@/lib/supabase/server'
import { getAutoFetchPreference } from '@/lib/services/users'
import LinkList from './link/LinkList'

export const metadata = {
  title: 'Dashboard — Link Vault',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const autoFetchDefault = await getAutoFetchPreference(supabase)

  return <LinkList autoFetchDefault={autoFetchDefault} />
}
