import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LogoutButton from './LogoutButton'

export const metadata = {
  title: 'Dashboard — Link Vault',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <div className="text-center space-y-4">
        <div className="text-4xl">🔖</div>
        <h1 className="text-xl font-semibold text-slate-900">Link Vault</h1>
        <p className="text-sm text-slate-500">{user.email}</p>
        <LogoutButton />
      </div>
    </main>
  )
}
