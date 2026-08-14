// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useState } from 'react'
import { useTagEditForm } from '@/lib/hooks/tags/useTagEditForm'
import { COLORS } from '@/components/ColorPicker'
import type { TagWithCount } from '@/lib/services/tags'

vi.mock('@/lib/services/tags', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/services/tags')>()
  return { ...actual, updateTag: vi.fn() }
})

import { updateTag } from '@/lib/services/tags'
const mockUpdateTag = vi.mocked(updateTag)
const mockRefetchTags = vi.fn()

const FAKE_DEK = {} as CryptoKey

const MOCK_TAG: TagWithCount = {
  id: '1', user_id: 'u1', name: 'react', color: 'indigo',
  is_private: false, created_at: '2026-01-01T00:00:00Z', link_count: 3,
}
const MOCK_TAG_2: TagWithCount = {
  id: '2', user_id: 'u1', name: 'typescript', color: 'sky',
  is_private: false, created_at: '2026-01-01T00:00:00Z', link_count: 1,
}

function useHarness(initial: TagWithCount[] = [MOCK_TAG, MOCK_TAG_2]) {
  const [tags, setTags] = useState<TagWithCount[]>(initial)
  return { tags, ...useTagEditForm(setTags, FAKE_DEK, mockRefetchTags) }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useTagEditForm', () => {
  it('sets editingId and populates edit fields from the tag', () => {
    const { result } = renderHook(() => useHarness())

    act(() => { result.current.startEdit(MOCK_TAG) })

    expect(result.current.editingId).toBe(MOCK_TAG.id)
    expect(result.current.editName).toBe(MOCK_TAG.name)
    expect(result.current.editColor).toBe(MOCK_TAG.color)
  })

  it('falls back to the first color when tag.color is null', () => {
    const { result } = renderHook(() => useHarness())

    act(() => { result.current.startEdit({ ...MOCK_TAG, color: null }) })

    expect(result.current.editColor).toBe(COLORS[0].value)
  })

  it('startEdit clears a previous editError', async () => {
    mockUpdateTag.mockResolvedValue({ data: null, error: 'name_taken' })
    const { result } = renderHook(() => useHarness())

    act(() => { result.current.startEdit(MOCK_TAG) })
    await act(async () => result.current.saveEdit())
    expect(result.current.editError).not.toBeNull()

    act(() => { result.current.startEdit(MOCK_TAG_2) })
    expect(result.current.editError).toBeNull()
  })

  it('cancelEditing clears editingId only', () => {
    const { result } = renderHook(() => useHarness())

    act(() => { result.current.startEdit(MOCK_TAG) })
    act(() => { result.current.cancelEditing() })

    expect(result.current.editingId).toBeNull()
  })

  it('calls updateTag with the kebab-cased name and color', async () => {
    mockUpdateTag.mockResolvedValue({ data: { ...MOCK_TAG, name: 'react-19', color: 'sky' }, error: null })
    const { result } = renderHook(() => useHarness())

    act(() => { result.current.startEdit(MOCK_TAG); result.current.setEditName('React 19'); result.current.setEditColor('sky') })
    await act(async () => result.current.saveEdit())

    expect(mockUpdateTag).toHaveBeenCalledWith({ id: MOCK_TAG.id, name: 'react-19', color: 'sky', is_private: false }, FAKE_DEK)
  })

  it('updates the tag in the list, clears editingId, and refetches', async () => {
    const updated = { ...MOCK_TAG, name: 'react-19', color: 'sky' }
    mockUpdateTag.mockResolvedValue({ data: updated, error: null })
    const { result } = renderHook(() => useHarness())

    act(() => { result.current.startEdit(MOCK_TAG); result.current.setEditName('React 19'); result.current.setEditColor('sky') })
    await act(async () => result.current.saveEdit())

    const tag = result.current.tags.find(t => t.id === MOCK_TAG.id)
    expect(tag?.name).toBe('react-19')
    expect(tag?.color).toBe('sky')
    expect(result.current.editingId).toBeNull()
    expect(mockRefetchTags).toHaveBeenCalledOnce()
  })

  it('preserves link_count after an update', async () => {
    mockUpdateTag.mockResolvedValue({ data: { ...MOCK_TAG, name: 'react-19' }, error: null })
    const { result } = renderHook(() => useHarness())

    act(() => { result.current.startEdit(MOCK_TAG); result.current.setEditName('React 19') })
    await act(async () => result.current.saveEdit())

    expect(result.current.tags.find(t => t.id === MOCK_TAG.id)?.link_count).toBe(MOCK_TAG.link_count)
  })

  it('does not call updateTag when name is blank', async () => {
    const { result } = renderHook(() => useHarness())

    act(() => { result.current.startEdit(MOCK_TAG); result.current.setEditName('') })
    await act(async () => result.current.saveEdit())

    expect(mockUpdateTag).not.toHaveBeenCalled()
    expect(result.current.editingId).toBe(MOCK_TAG.id)
  })

  it('does not call updateTag when kebab-case result is empty', async () => {
    const { result } = renderHook(() => useHarness())

    act(() => { result.current.startEdit(MOCK_TAG); result.current.setEditName('!!!') })
    await act(async () => result.current.saveEdit())

    expect(mockUpdateTag).not.toHaveBeenCalled()
  })

  it('sets editError and keeps editingId on name_taken', async () => {
    mockUpdateTag.mockResolvedValue({ data: null, error: 'name_taken' })
    const { result } = renderHook(() => useHarness())

    act(() => { result.current.startEdit(MOCK_TAG); result.current.setEditName('typescript') })
    await act(async () => result.current.saveEdit())

    expect(result.current.editError).toBeTruthy()
    expect(result.current.editingId).toBe(MOCK_TAG.id)
  })
})
