import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAccentColors, getSurfaceFamily, getThemeMode } from '@/lib/services/userPreferences'
import { ToastProvider } from '@/components/ToastProvider'
import { UnlockedTagsProvider } from '@/lib/context/UnlockedTagsContext'
import { TagsProvider } from '@/lib/context/TagsContext'
import { DashboardHeaderSlotProvider } from '@/lib/context/DashboardHeaderSlotContext'
import VaultUnlockGate from '@/components/VaultUnlockGate'
import DashboardHeader from './DashboardHeader'
import DashboardNav from './DashboardNav'
import AccentSync from './AccentSync'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { light, dark } = await getAccentColors(supabase)
  const surface = await getSurfaceFamily(supabase)
  const mode = await getThemeMode(supabase)

  return (
    <ToastProvider>
      <AccentSync light={light} dark={dark} surface={surface} mode={mode} />
      <UnlockedTagsProvider>
        <VaultUnlockGate>
          <TagsProvider>
            <DashboardHeaderSlotProvider>
              <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
                <DashboardHeader userEmail={user.email ?? ''} />
                <DashboardNav />
                <div className="pb-[calc(5rem+env(safe-area-inset-bottom))] sm:pb-0">
                  {children}
                </div>
              </div>
            </DashboardHeaderSlotProvider>
          </TagsProvider>
        </VaultUnlockGate>
      </UnlockedTagsProvider>
    </ToastProvider>
  )
}
