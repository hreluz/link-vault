import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getAccentColors, getSurfaceFamily, getThemeMode } from '@/lib/services/userPreferences'
import AppearanceForm from './AppearanceForm'

export const metadata: Metadata = { title: 'Appearance — Link Vault' }

export default async function AppearancePage() {
  const supabase = await createClient()
  const { light, dark } = await getAccentColors(supabase)
  const surface = await getSurfaceFamily(supabase)
  const mode = await getThemeMode(supabase)

  return <AppearanceForm initialLight={light} initialDark={dark} initialSurface={surface} initialMode={mode} />
}
