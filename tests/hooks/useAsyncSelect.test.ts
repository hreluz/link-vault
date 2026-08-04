// @vitest-environment jsdom

import { describe, it, expect, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAsyncSelect } from '@/lib/hooks/useAsyncSelect'

describe('useAsyncSelect', () => {
  it('starts with the initial value and no error', () => {
    const action = vi.fn()
    const { result } = renderHook(() => useAsyncSelect<string>('indigo', action))

    expect(result.current.value).toBe('indigo')
    expect(result.current.error).toBeNull()
    expect(result.current.isPending).toBe(false)
  })

  it('applies the new value optimistically and calls the action', async () => {
    const action = vi.fn().mockResolvedValue({ success: true })
    const { result } = renderHook(() => useAsyncSelect<string>('indigo', action))

    act(() => result.current.select('violet'))

    expect(result.current.value).toBe('violet')
    await waitFor(() => expect(action).toHaveBeenCalledWith('violet'))
    expect(result.current.error).toBeNull()
  })

  it('rolls back to the previous value when the action fails', async () => {
    const action = vi.fn().mockResolvedValue({ success: false, error: 'Invalid accent color' })
    const { result } = renderHook(() => useAsyncSelect<string>('indigo', action))

    act(() => result.current.select('violet'))
    expect(result.current.value).toBe('violet')

    await waitFor(() => expect(result.current.error).toBe('Invalid accent color'))
    expect(result.current.value).toBe('indigo')
  })

  it('is a no-op when selecting the currently active value', () => {
    const action = vi.fn()
    const { result } = renderHook(() => useAsyncSelect<string>('indigo', action))

    act(() => result.current.select('indigo'))

    expect(action).not.toHaveBeenCalled()
  })

  it('serializes overlapping selects so an earlier call cannot resolve after a later one and overwrite it', async () => {
    let resolveFirst: (r: { success: true }) => void
    let resolveSecond: (r: { success: true }) => void
    const firstPromise = new Promise<{ success: true }>(resolve => { resolveFirst = resolve })
    const secondPromise = new Promise<{ success: true }>(resolve => { resolveSecond = resolve })

    const action = vi.fn()
      .mockReturnValueOnce(firstPromise)
      .mockReturnValueOnce(secondPromise)

    const { result } = renderHook(() => useAsyncSelect<string>('indigo', action))

    act(() => result.current.select('violet'))
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1))
    expect(action).toHaveBeenCalledWith('violet')

    act(() => result.current.select('rose'))

    // The second pick's action must not fire until the first one's request
    // has actually settled -- otherwise a slow-resolving first request could
    // land at the database after the second one and silently revert it.
    expect(action).toHaveBeenCalledTimes(1)

    resolveFirst!({ success: true })
    await waitFor(() => expect(action).toHaveBeenCalledTimes(2))
    expect(action).toHaveBeenNthCalledWith(2, 'rose')

    resolveSecond!({ success: true })
    await waitFor(() => expect(result.current.isPending).toBe(false))
    expect(result.current.value).toBe('rose')
    expect(result.current.error).toBeNull()
  })
})
