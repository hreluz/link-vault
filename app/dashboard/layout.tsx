import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ToastProvider } from '@/components/ToastProvider'
import DashboardHeader from './DashboardHeader'
import DashboardNav from './DashboardNav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <ToastProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <DashboardHeader userEmail={user.email ?? ''} />
        <DashboardNav />
        <div className="pb-20 sm:pb-0">
          {children}
        </div>
      </div>
    </ToastProvider>
  )
}
