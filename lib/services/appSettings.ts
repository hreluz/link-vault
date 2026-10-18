import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'

export type AppSettingsResult =
  | { success: true }
  | { success: false; error: string }

export async function isRegistrationEnabled(
  supabase: SupabaseClient<Database>,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('registrations_enabled')
    .limit(1)
    .maybeSingle()

  if (error || !data) return true
  return data.registrations_enabled
}

export async function setRegistrationEnabled(
  supabase: SupabaseClient<Database>,
  enabled: boolean,
): Promise<AppSettingsResult> {
  const { data: existing, error: fetchError } = await supabase
    .from('app_settings')
    .select('id')
    .limit(1)
    .maybeSingle()

  if (fetchError || !existing) return { success: false, error: 'App settings not found' }

  const { error: updateError } = await supabase
    .from('app_settings')
    .update({ registrations_enabled: enabled, updated_at: new Date().toISOString() })
    .eq('id', existing.id)

  if (updateError) return { success: false, error: updateError.message }
  return { success: true }
}

export async function isRestartAccountEnabled(
  supabase: SupabaseClient<Database>,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('restart_account_enabled')
    .limit(1)
    .maybeSingle()

  if (error || !data) return true
  return data.restart_account_enabled
}

export async function setRestartAccountEnabled(
  supabase: SupabaseClient<Database>,
  enabled: boolean,
): Promise<AppSettingsResult> {
  const { data: existing, error: fetchError } = await supabase
    .from('app_settings')
    .select('id')
    .limit(1)
    .maybeSingle()

  if (fetchError || !existing) return { success: false, error: 'App settings not found' }

  const { error: updateError } = await supabase
    .from('app_settings')
    .update({ restart_account_enabled: enabled, updated_at: new Date().toISOString() })
    .eq('id', existing.id)

  if (updateError) return { success: false, error: updateError.message }
  return { success: true }
}

/** Admin-tunable knobs for the import auto-fetch guard (SPEC 08). App-wide: the guard protects
 *  the server's IP, which every user shares. */
export type ImportFetchSettings = {
  /** Minimum seconds between fetches to the same host group; 0 turns the throttle off. */
  fetchGapSeconds: number
  /** Seconds "Wait and retry" waits before re-fetching a blocked row. */
  retryWaitSeconds: number
  /** Consecutive empty fetches from one host group that pause the import. */
  emptyStreakLimit: number
}

export const DEFAULT_IMPORT_FETCH_SETTINGS: ImportFetchSettings = {
  fetchGapSeconds: 2,
  retryWaitSeconds: 60,
  emptyStreakLimit: 3,
}

/** Inclusive [min, max] per field; mirrored by the `check` constraints in 0018_import_fetch_settings.sql. */
export const IMPORT_FETCH_LIMITS = {
  fetchGapSeconds: [0, 30],
  retryWaitSeconds: [10, 600],
  emptyStreakLimit: [1, 10],
} as const satisfies Record<keyof ImportFetchSettings, readonly [number, number]>

const IMPORT_FETCH_LABELS: Record<keyof ImportFetchSettings, string> = {
  fetchGapSeconds: 'Same-host gap',
  retryWaitSeconds: 'Retry wait',
  emptyStreakLimit: 'Empty-fetch limit',
}

/** `null` when every field is a whole number within its range; otherwise the first problem. */
export function validateImportFetchSettings(settings: ImportFetchSettings): string | null {
  for (const key of Object.keys(IMPORT_FETCH_LIMITS) as (keyof ImportFetchSettings)[]) {
    const [min, max] = IMPORT_FETCH_LIMITS[key]
    const value = settings[key]
    if (!Number.isInteger(value) || value < min || value > max) {
      return `${IMPORT_FETCH_LABELS[key]} must be a whole number from ${min} to ${max}.`
    }
  }
  return null
}

/** Falls back to the defaults on any read problem, so a settings outage never blocks an import. */
export async function getImportFetchSettings(
  supabase: SupabaseClient<Database>,
): Promise<ImportFetchSettings> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('import_fetch_gap_seconds, import_retry_wait_seconds, import_empty_streak_limit')
    .limit(1)
    .maybeSingle()

  if (error || !data) return DEFAULT_IMPORT_FETCH_SETTINGS
  return {
    fetchGapSeconds: data.import_fetch_gap_seconds ?? DEFAULT_IMPORT_FETCH_SETTINGS.fetchGapSeconds,
    retryWaitSeconds: data.import_retry_wait_seconds ?? DEFAULT_IMPORT_FETCH_SETTINGS.retryWaitSeconds,
    emptyStreakLimit: data.import_empty_streak_limit ?? DEFAULT_IMPORT_FETCH_SETTINGS.emptyStreakLimit,
  }
}

export async function setImportFetchSettings(
  supabase: SupabaseClient<Database>,
  settings: ImportFetchSettings,
): Promise<AppSettingsResult> {
  const invalid = validateImportFetchSettings(settings)
  if (invalid) return { success: false, error: invalid }

  const { data: existing, error: fetchError } = await supabase
    .from('app_settings')
    .select('id')
    .limit(1)
    .maybeSingle()

  if (fetchError || !existing) return { success: false, error: 'App settings not found' }

  const { error: updateError } = await supabase
    .from('app_settings')
    .update({
      import_fetch_gap_seconds: settings.fetchGapSeconds,
      import_retry_wait_seconds: settings.retryWaitSeconds,
      import_empty_streak_limit: settings.emptyStreakLimit,
      updated_at: new Date().toISOString(),
    })
    .eq('id', existing.id)

  if (updateError) return { success: false, error: updateError.message }
  return { success: true }
}
