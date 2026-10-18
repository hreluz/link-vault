import { describe, it, expect, vi, beforeEach } from 'vitest'
import { saveImportFetchSettingsAction } from '@/app/dashboard/config/admin-settings/actions'

const { mockCreateClient, mockGetCurrentUserRole, mockSetImportFetchSettings } = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
  mockGetCurrentUserRole: vi.fn(),
  mockSetImportFetchSettings: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({ createClient: mockCreateClient }))
vi.mock('@/lib/services/users', () => ({ getCurrentUserRole: mockGetCurrentUserRole }))
vi.mock('@/lib/services/appSettings', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/services/appSettings')>()),
  setImportFetchSettings: mockSetImportFetchSettings,
}))

const SETTINGS = { fetchGapSeconds: 5, retryWaitSeconds: 30, emptyStreakLimit: 2 }

beforeEach(() => {
  vi.clearAllMocks()
  mockCreateClient.mockResolvedValue({})
  mockGetCurrentUserRole.mockResolvedValue('admin')
  mockSetImportFetchSettings.mockResolvedValue({ success: true })
})

describe('saveImportFetchSettingsAction', () => {
  it('saves the settings for an admin', async () => {
    expect(await saveImportFetchSettingsAction(SETTINGS)).toEqual({ success: true })
    expect(mockSetImportFetchSettings).toHaveBeenCalledWith({}, SETTINGS)
  })

  it('rejects a non-admin without saving', async () => {
    mockGetCurrentUserRole.mockResolvedValue('user')

    expect(await saveImportFetchSettingsAction(SETTINGS)).toEqual({ success: false, error: 'Not authorized' })
    expect(mockSetImportFetchSettings).not.toHaveBeenCalled()
  })

  it('returns the service error for invalid values', async () => {
    mockSetImportFetchSettings.mockResolvedValue({ success: false, error: 'Same-host gap must be a whole number from 0 to 30.' })

    const result = await saveImportFetchSettingsAction({ ...SETTINGS, fetchGapSeconds: 31 })

    expect(result).toEqual({ success: false, error: 'Same-host gap must be a whole number from 0 to 30.' })
  })
})
