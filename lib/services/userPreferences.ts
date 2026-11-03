import type { SupabaseClient } from '@supabase/supabase-js'
import type { AccentColor, Database, SurfaceFamily, ThemeMode } from '@/lib/types/database'
import type { ToggleResult } from '@/lib/hooks/shared/useAsyncToggle'
import { isValidAccent } from '@/lib/utils/accentRamp'
import { isValidSurfaceFamily } from '@/lib/utils/surfaceFamilies'

const DEFAULT_ACCENT: AccentColor = 'indigo'
const DEFAULT_SURFACE: SurfaceFamily = 'slate'
const DEFAULT_THEME_MODE: ThemeMode = 'system'
const THEME_MODES: ThemeMode[] = ['light', 'dark', 'system']

export async function getAutoFetchPreference(
  supabase: SupabaseClient<Database>,
): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return true

  const { data } = await supabase
    .from('user_preferences')
    .select('auto_fetch_enabled')
    .eq('user_id', user.id)
    .single()

  return data?.auto_fetch_enabled ?? true
}

export async function setAutoFetchPreference(
  supabase: SupabaseClient<Database>,
  enabled: boolean,
): Promise<ToggleResult> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { error } = await supabase
    .from('user_preferences')
    .update({ auto_fetch_enabled: enabled })
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export const DEFAULT_MOVE_TO_END_DELAY_SECONDS = 30
/** Inclusive [min, max]; mirrored by the `check` constraint in 0021_move_to_end_delay_preference.sql. */
export const MOVE_TO_END_DELAY_LIMITS = [5, 600] as const

/** `null` when valid; otherwise the error message. */
export function validateMoveToEndDelay(seconds: number): string | null {
  const [min, max] = MOVE_TO_END_DELAY_LIMITS
  if (!Number.isInteger(seconds) || seconds < min || seconds > max) {
    return `The delay must be a whole number from ${min} to ${max}.`
  }
  return null
}

/** Returns the default when there is no user or the read fails. */
export async function getMoveToEndDelay(
  supabase: SupabaseClient<Database>,
): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return DEFAULT_MOVE_TO_END_DELAY_SECONDS

  const { data } = await supabase
    .from('user_preferences')
    .select('move_to_end_delay_seconds')
    .eq('user_id', user.id)
    .single()

  return data?.move_to_end_delay_seconds ?? DEFAULT_MOVE_TO_END_DELAY_SECONDS
}

export async function setMoveToEndDelay(
  supabase: SupabaseClient<Database>,
  seconds: number,
): Promise<ToggleResult> {
  const invalid = validateMoveToEndDelay(seconds)
  if (invalid) return { success: false, error: invalid }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { error } = await supabase
    .from('user_preferences')
    .update({ move_to_end_delay_seconds: seconds })
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function getAccentColors(
  supabase: SupabaseClient<Database>,
): Promise<{ light: AccentColor; dark: AccentColor }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { light: DEFAULT_ACCENT, dark: DEFAULT_ACCENT }

  const { data } = await supabase
    .from('user_preferences')
    .select('accent_color_light, accent_color_dark')
    .eq('user_id', user.id)
    .single()

  return {
    light: data?.accent_color_light ?? DEFAULT_ACCENT,
    dark: data?.accent_color_dark ?? DEFAULT_ACCENT,
  }
}

export async function setAccentColor(
  supabase: SupabaseClient<Database>,
  mode: 'light' | 'dark',
  accent: AccentColor,
): Promise<ToggleResult> {
  if (!isValidAccent(accent)) return { success: false, error: 'Invalid accent color' }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const payload = mode === 'light' ? { accent_color_light: accent } : { accent_color_dark: accent }
  const { error } = await supabase.from('user_preferences').update(payload).eq('user_id', user.id)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function getSurfaceFamily(
  supabase: SupabaseClient<Database>,
): Promise<SurfaceFamily> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return DEFAULT_SURFACE

  const { data } = await supabase
    .from('user_preferences')
    .select('surface_family')
    .eq('user_id', user.id)
    .single()

  return data?.surface_family ?? DEFAULT_SURFACE
}

export async function setSurfaceFamily(
  supabase: SupabaseClient<Database>,
  family: SurfaceFamily,
): Promise<ToggleResult> {
  if (!isValidSurfaceFamily(family)) return { success: false, error: 'Invalid surface family' }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { error } = await supabase
    .from('user_preferences')
    .update({ surface_family: family })
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function getThemeMode(
  supabase: SupabaseClient<Database>,
): Promise<ThemeMode> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return DEFAULT_THEME_MODE

  const { data } = await supabase
    .from('user_preferences')
    .select('theme_mode')
    .eq('user_id', user.id)
    .single()

  return data?.theme_mode ?? DEFAULT_THEME_MODE
}

export async function setThemeMode(
  supabase: SupabaseClient<Database>,
  mode: ThemeMode,
): Promise<ToggleResult> {
  if (!THEME_MODES.includes(mode)) return { success: false, error: 'Invalid theme mode' }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { error } = await supabase
    .from('user_preferences')
    .update({ theme_mode: mode })
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }
  return { success: true }
}
