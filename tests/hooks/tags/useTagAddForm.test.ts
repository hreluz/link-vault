// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useState } from 'react'
import { useTagAddForm } from '@/lib/hooks/tags/useTagAddForm'
import { COLORS } from '@/components/ColorPicker'
import type { TagWithCount } from '@/lib/services/tags/tags'

vi.mock('@/lib/services/tags/tags', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/services/tags/tags')>()
  return { ...actual, createTag: vi.fn() }
})

import { createTag } from '@/lib/services/tags/tags'
const mockCreateTag = vi.mocked(createTag)
const mockRefetchTags = vi.fn()

const FAKE_DEK = {} as CryptoKey

const MOCK_TAG: TagWithCount = {
  id: '1', user_id: 'u1', name: 'react', color: 'indigo',
  is_private: false, created_at: '2026-01-01T00:00:00Z', link_count: 3,
}

function useHarness(initial: TagWithCount[] = [MOCK_TAG]) {
  const [tags, setTags] = useState<TagWithCount[]>(initial)
  return { tags, ...useTagAddForm(setTags, FAKE_DEK, mockRefetchTags) }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useTagAddForm', () => {
  it('starts with adding=false and no error', () => {
    const { result } = renderHook(() => useHarness())

    expect(result.current.adding).toBe(false)
    expect(result.current.addError).toBeNull()
  })

  it('openAdd sets adding=true and clears addError', () => {
    const { result } = renderHook(() => useHarness())

    act(() => { result.current.openAdd() })

    expect(result.current.adding).toBe(true)
    expect(result.current.addError).toBeNull()
  })

  it('closeAdd resets the new-tag form and clears addError', () => {
    const { result } = renderHook(() => useHarness())

    act(() => {
      result.current.openAdd()
      result.current.setNewName('draft')
      result.current.setNewColor('rose')
    })
    act(() => { result.current.closeAdd() })

    expect(result.current.adding).toBe(false)
    expect(result.current.newName).toBe('')
    expect(result.current.newColor).toBe(COLORS[0].value)
    expect(result.current.addError).toBeNull()
  })

  it('cancelAdding sets adding=false without touching fields or error', async () => {
    mockCreateTag.mockResolvedValue({ data: null, error: 'name_taken' })
    const { result } = renderHook(() => useHarness())

    act(() => { result.current.openAdd(); result.current.setNewName('react') })
    await act(async () => result.current.addTag())
    expect(result.current.addError).not.toBeNull()

    act(() => { result.current.cancelAdding() })

    expect(result.current.adding).toBe(false)
    expect(result.current.addError).not.toBeNull()
  })

  it('calls createTag with the kebab-cased name and color', async () => {
    mockCreateTag.mockResolvedValue({ data: { ...MOCK_TAG, id: '3', name: 'my-vue-app' }, error: null })
    const { result } = renderHook(() => useHarness())

    act(() => { result.current.openAdd(); result.current.setNewName('My Vue App'); result.current.setNewColor('emerald') })
    await act(async () => result.current.addTag())

    expect(mockCreateTag).toHaveBeenCalledWith({ name: 'my-vue-app', color: 'emerald', is_private: false }, FAKE_DEK)
  })

  it('appends the new tag with link_count 0, closes the form, and refetches', async () => {
    const newTagData = { id: '3', user_id: 'u1', name: 'vue', color: 'emerald', is_private: false, created_at: '2026-01-01T00:00:00Z' }
    mockCreateTag.mockResolvedValue({ data: newTagData, error: null })
    const { result } = renderHook(() => useHarness())

    act(() => { result.current.openAdd(); result.current.setNewName('Vue') })
    await act(async () => result.current.addTag())

    expect(result.current.tags).toHaveLength(2)
    expect(result.current.tags.at(-1)).toMatchObject({ name: 'vue', link_count: 0 })
    expect(result.current.adding).toBe(false)
    expect(mockRefetchTags).toHaveBeenCalledOnce()
  })

  it('does not call createTag when name is blank', async () => {
    const { result } = renderHook(() => useHarness())

    act(() => { result.current.openAdd() })
    await act(async () => result.current.addTag())

    expect(mockCreateTag).not.toHaveBeenCalled()
  })

  it('does not call createTag when kebab-case result is empty', async () => {
    const { result } = renderHook(() => useHarness())

    act(() => { result.current.openAdd(); result.current.setNewName('!!!') })
    await act(async () => result.current.addTag())

    expect(mockCreateTag).not.toHaveBeenCalled()
  })

  it('sets addError and keeps the form open on name_taken', async () => {
    mockCreateTag.mockResolvedValue({ data: null, error: 'name_taken' })
    const { result } = renderHook(() => useHarness())

    act(() => { result.current.openAdd(); result.current.setNewName('react') })
    await act(async () => result.current.addTag())

    expect(result.current.addError).toBeTruthy()
    expect(result.current.adding).toBe(true)
    expect(result.current.tags).toHaveLength(1)
  })

  it('sets addError and keeps the form open on db_error', async () => {
    mockCreateTag.mockResolvedValue({ data: null, error: 'db_error' })
    const { result } = renderHook(() => useHarness())

    act(() => { result.current.openAdd(); result.current.setNewName('vue') })
    await act(async () => result.current.addTag())

    expect(result.current.addError).toBeTruthy()
    expect(result.current.adding).toBe(true)
  })
})
