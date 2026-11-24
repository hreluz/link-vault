// @vitest-environment jsdom
// SPEC 40: the link form's Collections field state and what Add/Edit write on Save.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAddLinkForm } from '@/lib/hooks/links/form/useAddLinkForm'
import { useEditLinkForm } from '@/lib/hooks/links/form/useEditLinkForm'
import type { LinkWithTags } from '@/lib/services/links'

const LINK: LinkWithTags = {
  id: 'l1', url: 'https://example.com', title: 'Example', description: null,
  category_id: 'cat-1', status: 'unread', is_favorite: false, image_url: null, deleted_at: null, moved_to_end_at: null,
  duration: null, tags: [], notes: null, site_name: 'example.com', user_id: 'user-1',
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
}

vi.mock('@/app/dashboard/link/actions', () => ({ fetchLinkMeta: vi.fn() }))
vi.mock('@/lib/services/links', () => ({ createLink: vi.fn(), updateLink: vi.fn(), findLinkIdByUrl: vi.fn() }))
vi.mock('@/lib/services/collections', () => ({
  getCollectionIdsForLink: vi.fn(),
  getCollections: vi.fn(),
  createPendingCollections: vi.fn(),
  setLinkCollections: vi.fn(),
}))
const { FAKE_DEK, toastError } = vi.hoisted(() => ({ FAKE_DEK: {} as CryptoKey, toastError: vi.fn() }))
vi.mock('sonner', () => ({ toast: { error: toastError } }))
vi.mock('@/lib/context/VaultContext', () => ({ useVault: () => ({ dek: FAKE_DEK }) }))
vi.mock('@/lib/context/TagsContext', () => ({ useTagsContext: () => ({ tags: [], loading: false, refetchTags: vi.fn() }) }))

import { createLink, updateLink, findLinkIdByUrl } from '@/lib/services/links'
import { getCollectionIdsForLink, getCollections, createPendingCollections, setLinkCollections } from '@/lib/services/collections'
import { fetchLinkMeta } from '@/app/dashboard/link/actions'

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(createLink).mockResolvedValue(LINK)
  vi.mocked(updateLink).mockResolvedValue(LINK)
  vi.mocked(findLinkIdByUrl).mockResolvedValue(null)
  vi.mocked(fetchLinkMeta).mockResolvedValue({ title: null, description: null, image: null, duration: null } as never)
  vi.mocked(getCollectionIdsForLink).mockResolvedValue(['keep', 'drop'])
  vi.mocked(createPendingCollections).mockImplementation(async names => names.map((_, i) => `new-${i}`))
  vi.mocked(setLinkCollections).mockResolvedValue(true)
})

function addForm() {
  const hook = renderHook(() => useAddLinkForm(undefined, undefined, true, false))
  act(() => {
    hook.result.current.setUrl('https://example.com')
    hook.result.current.setCategoryId('cat-1')
  })
  return hook
}

async function editForm() {
  const hook = renderHook(() => useEditLinkForm(LINK))
  await waitFor(() => expect(hook.result.current.membershipState).toBe('ready'))
  return hook
}

describe('Add link form collections', () => {
  it('starts empty', () => {
    const { result } = addForm()
    expect(result.current.collectionIds).toEqual([])
    expect(result.current.newCollectionNames).toEqual([])
  })

  it('appends the link to the selected collections after it saves', async () => {
    const { result } = addForm()
    act(() => result.current.setCollectionIds(['r', 'v']))
    await act(async () => { await result.current.handleSubmit() })
    expect(setLinkCollections).toHaveBeenCalledWith('l1', ['r', 'v'], [])
    expect(createPendingCollections).not.toHaveBeenCalled()
  })

  it('creates pending names on Save and adds the link to them', async () => {
    const { result } = addForm()
    act(() => { result.current.setCollectionIds(['r']); result.current.setNewCollectionNames(['Go basics']) })
    await act(async () => { await result.current.handleSubmit() })
    expect(createPendingCollections).toHaveBeenCalledWith(['Go basics'], FAKE_DEK)
    expect(setLinkCollections).toHaveBeenCalledWith('l1', ['r', 'new-0'], [])
  })

  it('creates a second same-named collection without re-reading the list', async () => {
    const { result } = addForm()
    act(() => result.current.setNewCollectionNames(['Go basics']))
    await act(async () => { await result.current.handleSubmit() })
    expect(getCollections).not.toHaveBeenCalled()
    expect(createPendingCollections).toHaveBeenCalledWith(['Go basics'], FAKE_DEK)
  })

  it('keeps the link saved and toasts when creating a collection fails', async () => {
    vi.mocked(createPendingCollections).mockResolvedValue(null)
    const { result } = addForm()
    act(() => result.current.setNewCollectionNames(['Go basics']))
    let saved: LinkWithTags | null = null
    await act(async () => { saved = await result.current.handleSubmit() })
    expect(saved).toEqual(LINK)
    expect(setLinkCollections).not.toHaveBeenCalled()
    expect(toastError).toHaveBeenCalledWith("Link saved, but collections weren't updated")
  })

  it('writes nothing when there are no collections', async () => {
    const { result } = addForm()
    await act(async () => { await result.current.handleSubmit() })
    expect(setLinkCollections).not.toHaveBeenCalled()
    expect(createPendingCollections).not.toHaveBeenCalled()
  })

  it('Cancel (closing without saving) writes nothing, and reopening clears pending names', () => {
    const { result, rerender } = renderHook(({ open }) => useAddLinkForm(undefined, undefined, open, false), { initialProps: { open: true } })
    act(() => result.current.setNewCollectionNames(['Go basics']))
    rerender({ open: false })
    rerender({ open: true })
    expect(result.current.newCollectionNames).toEqual([])
    expect(createPendingCollections).not.toHaveBeenCalled()
  })
})

describe('Edit link form collections', () => {
  it("opens with the link's current collections and no changes", async () => {
    const { result } = await editForm()
    expect(result.current.collectionIds).toEqual(['keep', 'drop'])
    expect(result.current.hasChanges).toBe(false)
  })

  it('writes only the difference on Save', async () => {
    const { result } = await editForm()
    act(() => result.current.setCollectionIds(['keep', 'added']))
    expect(result.current.hasChanges).toBe(true)
    await act(async () => { await result.current.handleSubmit() })
    expect(setLinkCollections).toHaveBeenCalledWith('l1', ['added'], ['drop'])
    expect(result.current.savedCollectionIds()).toEqual(['keep', 'added'])
  })

  it('a pending name alone counts as a change, and Save creates it and adds the link', async () => {
    const { result } = await editForm()
    act(() => result.current.setNewCollectionNames(['Go basics']))
    expect(result.current.hasChanges).toBe(true)
    await act(async () => { await result.current.handleSubmit() })
    expect(createPendingCollections).toHaveBeenCalledWith(['Go basics'], FAKE_DEK)
    expect(setLinkCollections).toHaveBeenCalledWith('l1', ['new-0'], [])
    expect(result.current.savedCollectionIds()).toEqual(['keep', 'drop', 'new-0'])
  })

  it('leaves memberships alone when nothing about collections changed', async () => {
    const { result } = await editForm()
    act(() => result.current.setTitle('Changed'))
    await act(async () => { await result.current.handleSubmit() })
    expect(setLinkCollections).not.toHaveBeenCalled()
    expect(result.current.savedCollectionIds()).toBeNull()
  })

  it('leaves memberships alone after a failed load', async () => {
    vi.mocked(getCollectionIdsForLink).mockRejectedValue(new Error('x'))
    const { result } = renderHook(() => useEditLinkForm(LINK))
    await waitFor(() => expect(result.current.membershipState).toBe('error'))
    act(() => result.current.setTitle('Changed'))
    await act(async () => { await result.current.handleSubmit() })
    expect(updateLink).toHaveBeenCalled()
    expect(setLinkCollections).not.toHaveBeenCalled()
  })

  it('keeps the link saved and toasts when the membership write fails', async () => {
    vi.mocked(setLinkCollections).mockResolvedValue(false)
    const { result } = await editForm()
    act(() => result.current.setCollectionIds(['keep']))
    let saved: LinkWithTags | null = null
    await act(async () => { saved = await result.current.handleSubmit() })
    expect(saved).toEqual(LINK)
    expect(toastError).toHaveBeenCalledWith("Link saved, but collections weren't updated")
    expect(result.current.savedCollectionIds()).toBeNull()
  })
})
