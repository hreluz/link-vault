'use server'

import { createClient } from '@/lib/supabase/server'
import { setAccentColor, setSurfaceFamily, setThemeMode } from '@/lib/services/userPreferences'
import type { ToggleResult } from '@/lib/hooks/useAsyncToggle'
import type { AccentColor, SurfaceFamily, ThemeMode } from '@/lib/types/database'

export async function setAccentColorAction(
  mode: 'light' | 'dark',
  accent: AccentColor,
): Promise<ToggleResult> {
  const supabase = await createClient()
  return setAccentColor(supabase, mode, accent)
}

export async function setSurfaceFamilyAction(family: SurfaceFamily): Promise<ToggleResult> {
  const supabase = await createClient()
  return setSurfaceFamily(supabase, family)
}

export async function setThemeModeAction(mode: ThemeMode): Promise<ToggleResult> {
  const supabase = await createClient()
  return setThemeMode(supabase, mode)
}
