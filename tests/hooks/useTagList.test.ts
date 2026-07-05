// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useTagList } from '@/lib/hooks/tags/useTagList'
import { getTags, createTag, updateTag, deleteTag, getTagLinksCount } from '@/lib/services/tags'
import { COLORS } from '@/components/ColorPicker'
import type { TagWithCount } from '@/lib/services/tags'

// ── mock the service layer ────────────────────────────────────────────────────
// Keep the real toKebabCase — it's a pure function the hook relies on.

vi.mock('@/lib/services/tags', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/services/tags')>()
  return {
    ...actual,
    getTags: vi.fn(),
    createTag: vi.fn(),
    updateTag: vi.fn(),
    deleteTag: vi.fn(),
    getTagLinksCount: vi.fn(),
  }
})

const { FAKE_DEK } = vi.hoisted(() => ({ FAKE_DEK: {} as CryptoKey }))
vi.mock('@/lib/context/VaultContext', () => ({
  useVault: () => ({ dek: FAKE_DEK, isUnlocked: true, unlock: vi.fn(), changePassword: vi.fn(), lock: vi.fn() }),
}))

// ── fixtures ──────────────────────────────────────────────────────────────────

const MOCK_TAG: TagWithCount = {
  id: '1', user_id: 'u1', name: 'react', color: 'indigo',
  is_private: false,
  created_at: '2026-01-01T00:00:00Z', link_count: 3,
}
const MOCK_TAG_2: TagWithCount = {
  id: '2', user_id: 'u1', name: 'typescript', color: 'sky',
  is_private: false,
  created_at: '2026-01-01T00:00:00Z', link_count: 1,
}
const INITIAL_TAGS = [MOCK_TAG, MOCK_TAG_2]

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getTags).mockResolvedValue(INITIAL_TAGS)
  vi.mocked(getTagLinksCount).mockResolvedValue(0)
})

async function setup() {
  const utils = renderHook(() => useTagList())
  await waitFor(() => expect(utils.result.current.loading).toBe(false))
  return utils
}

// ── initial state ─────────────────────────────────────────────────────────────

describe('useTagList — initial state', () => {
  it('starts in loading state and resolves with service data', async () => {
    const { result } = renderHook(() => useTagList())
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.tags).toEqual(INITIAL_TAGS)
  })

  it('calls getTags on mount', async () => {
    await setup()
    expect(getTags).toHaveBeenCalledOnce()
  })

  it('starts with adding=false and no active panel', async () => {
    const { result } = await setup()
    expect(result.current.adding).toBe(false)
    expect(result.current.editingId).toBeNull()
    expect(result.current.deletingId).toBeNull()
  })

  it('starts with no errors', async () => {
    const { result } = await setup()
    expect(result.current.addError).toBeNull()
    expect(result.current.editError).toBeNull()
  })
})

// ── openAdd / closeAdd ────────────────────────────────────────────────────────

describe('useTagList — openAdd / closeAdd', () => {
  it('openAdd sets adding=true and clears panels and addError', async () => {
    const { result } = await setup()
    act(() => result.current.openAdd())
    expect(result.current.adding).toBe(true)
    expect(result.current.editingId).toBeNull()
    expect(result.current.deletingId).toBeNull()
    expect(result.current.addError).toBeNull()
  })

  it('closeAdd resets the new-tag form and clears addError', async () => {
    const { result } = await setup()
    act(() => result.current.openAdd())
    act(() => result.current.setNewName('draft'))
    act(() => result.current.setNewColor('rose'))
    act(() => result.current.closeAdd())
    expect(result.current.adding).toBe(false)
    expect(result.current.newName).toBe('')
    expect(result.current.newColor).toBe(COLORS[0].value)
    expect(result.current.addError).toBeNull()
  })
})

// ── addTag ────────────────────────────────────────────────────────────────────

describe('useTagList — addTag', () => {
  it('calls createTag with the kebab-cased name and color', async () => {
    vi.mocked(createTag).mockResolvedValue({ data: { ...MOCK_TAG, id: '3', name: 'my-vue-app' }, error: null })
    const { result } = await setup()
    act(() => result.current.openAdd())
    act(() => result.current.setNewName('My Vue App'))
    act(() => result.current.setNewColor('emerald'))
    await act(async () => result.current.addTag())
    expect(createTag).toHaveBeenCalledWith({ name: 'my-vue-app', color: 'emerald', is_private: false }, FAKE_DEK)
  })

  it('appends the new tag with link_count 0 and closes the form', async () => {
    const newTagData = { id: '3', user_id: 'u1', name: 'vue', color: 'emerald', is_private: false, created_at: '2026-01-01T00:00:00Z' }
    vi.mocked(createTag).mockResolvedValue({ data: newTagData, error: null })
    const { result } = await setup()
    act(() => result.current.openAdd())
    act(() => result.current.setNewName('Vue'))
    await act(async () => result.current.addTag())
    expect(result.current.tags).toHaveLength(3)
    expect(result.current.tags.at(-1)).toMatchObject({ name: 'vue', link_count: 0 })
    expect(result.current.adding).toBe(false)
  })

  it('does not call createTag when name is blank', async () => {
    const { result } = await setup()
    act(() => result.current.openAdd())
    await act(async () => result.current.addTag())
    expect(createTag).not.toHaveBeenCalled()
  })

  it('does not call createTag when kebab-case result is empty', async () => {
    const { result } = await setup()
    act(() => result.current.openAdd())
    act(() => result.current.setNewName('!!!'))
    await act(async () => result.current.addTag())
    expect(createTag).not.toHaveBeenCalled()
  })

  it('sets addError and keeps the form open on name_taken', async () => {
    vi.mocked(createTag).mockResolvedValue({ data: null, error: 'name_taken' })
    const { result } = await setup()
    act(() => result.current.openAdd())
    act(() => result.current.setNewName('react'))
    await act(async () => result.current.addTag())
    expect(result.current.addError).toBeTruthy()
    expect(result.current.adding).toBe(true)
    expect(result.current.tags).toHaveLength(2)
  })

  it('sets addError and keeps the form open on db_error', async () => {
    vi.mocked(createTag).mockResolvedValue({ data: null, error: 'db_error' })
    const { result } = await setup()
    act(() => result.current.openAdd())
    act(() => result.current.setNewName('vue'))
    await act(async () => result.current.addTag())
    expect(result.current.addError).toBeTruthy()
    expect(result.current.adding).toBe(true)
  })
})

// ── startEdit ─────────────────────────────────────────────────────────────────

describe('useTagList — startEdit', () => {
  it('sets editingId and populates edit fields from the tag', async () => {
    const { result } = await setup()
    act(() => result.current.startEdit(MOCK_TAG))
    expect(result.current.editingId).toBe(MOCK_TAG.id)
    expect(result.current.editName).toBe(MOCK_TAG.name)
    expect(result.current.editColor).toBe(MOCK_TAG.color)
  })

  it('closes the add form, clears deletingId and editError', async () => {
    const { result } = await setup()
    act(() => result.current.openAdd())
    act(() => result.current.confirmDelete(MOCK_TAG_2.id))
    act(() => result.current.startEdit(MOCK_TAG))
    expect(result.current.adding).toBe(false)
    expect(result.current.deletingId).toBeNull()
    expect(result.current.editError).toBeNull()
  })

  it('falls back to the first color when tag.color is null', async () => {
    const { result } = await setup()
    act(() => result.current.startEdit({ ...MOCK_TAG, color: null }))
    expect(result.current.editColor).toBe(COLORS[0].value)
  })
})

// ── saveEdit ──────────────────────────────────────────────────────────────────

describe('useTagList — saveEdit', () => {
  it('calls updateTag with the kebab-cased name and color', async () => {
    vi.mocked(updateTag).mockResolvedValue({ data: { ...MOCK_TAG, name: 'react-19', color: 'sky' }, error: null })
    const { result } = await setup()
    act(() => result.current.startEdit(MOCK_TAG))
    act(() => result.current.setEditName('React 19'))
    act(() => result.current.setEditColor('sky'))
    await act(async () => result.current.saveEdit())
    expect(updateTag).toHaveBeenCalledWith({ id: MOCK_TAG.id, name: 'react-19', color: 'sky', is_private: false }, FAKE_DEK)
  })

  it('updates the tag in the list and clears editingId', async () => {
    const updated = { ...MOCK_TAG, name: 'react-19', color: 'sky' }
    vi.mocked(updateTag).mockResolvedValue({ data: updated, error: null })
    const { result } = await setup()
    act(() => result.current.startEdit(MOCK_TAG))
    act(() => result.current.setEditName('React 19'))
    act(() => result.current.setEditColor('sky'))
    await act(async () => result.current.saveEdit())
    const tag = result.current.tags.find(t => t.id === MOCK_TAG.id)
    expect(tag?.name).toBe('react-19')
    expect(tag?.color).toBe('sky')
    expect(result.current.editingId).toBeNull()
  })

  it('preserves link_count after an update', async () => {
    vi.mocked(updateTag).mockResolvedValue({ data: { ...MOCK_TAG, name: 'react-19' }, error: null })
    const { result } = await setup()
    act(() => result.current.startEdit(MOCK_TAG))
    act(() => result.current.setEditName('React 19'))
    await act(async () => result.current.saveEdit())
    expect(result.current.tags.find(t => t.id === MOCK_TAG.id)?.link_count).toBe(MOCK_TAG.link_count)
  })

  it('does not call updateTag when name is blank', async () => {
    const { result } = await setup()
    act(() => result.current.startEdit(MOCK_TAG))
    act(() => result.current.setEditName(''))
    await act(async () => result.current.saveEdit())
    expect(updateTag).not.toHaveBeenCalled()
    expect(result.current.editingId).toBe(MOCK_TAG.id)
  })

  it('does not call updateTag when kebab-case result is empty', async () => {
    const { result } = await setup()
    act(() => result.current.startEdit(MOCK_TAG))
    act(() => result.current.setEditName('!!!'))
    await act(async () => result.current.saveEdit())
    expect(updateTag).not.toHaveBeenCalled()
  })

  it('sets editError and keeps editingId on name_taken', async () => {
    vi.mocked(updateTag).mockResolvedValue({ data: null, error: 'name_taken' })
    const { result } = await setup()
    act(() => result.current.startEdit(MOCK_TAG))
    act(() => result.current.setEditName('typescript'))
    await act(async () => result.current.saveEdit())
    expect(result.current.editError).toBeTruthy()
    expect(result.current.editingId).toBe(MOCK_TAG.id)
  })
})

// ── confirmDelete / deleteTag ─────────────────────────────────────────────────

describe('useTagList — confirmDelete / deleteTag', () => {
  it('confirmDelete sets deletingId and closes other panels', async () => {
    const { result } = await setup()
    act(() => result.current.openAdd())
    act(() => result.current.confirmDelete(MOCK_TAG.id))
    expect(result.current.deletingId).toBe(MOCK_TAG.id)
    expect(result.current.editingId).toBeNull()
    expect(result.current.adding).toBe(false)
  })

  it('calls deleteTag service and removes the tag from the list', async () => {
    vi.mocked(deleteTag).mockResolvedValue(true)
    const { result } = await setup()
    act(() => result.current.confirmDelete(MOCK_TAG.id))
    await act(async () => result.current.deleteTag(MOCK_TAG.id))
    expect(deleteTag).toHaveBeenCalledWith(MOCK_TAG.id)
    expect(result.current.tags.find(t => t.id === MOCK_TAG.id)).toBeUndefined()
    expect(result.current.deletingId).toBeNull()
  })

  it('sets deleteError and keeps the tag when the service fails', async () => {
    vi.mocked(deleteTag).mockResolvedValue(false)
    const { result } = await setup()
    act(() => result.current.confirmDelete(MOCK_TAG.id))
    await act(async () => result.current.deleteTag(MOCK_TAG.id))
    expect(result.current.deleteError).toBeTruthy()
    expect(result.current.tags.find(t => t.id === MOCK_TAG.id)).toBeDefined()
  })
})
