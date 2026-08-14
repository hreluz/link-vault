// @vitest-environment jsdom

import { describe, it, expect, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAsyncToggle } from '@/lib/hooks/shared/useAsyncToggle'

describe('useAsyncToggle', () => {
  it('starts with the initial enabled value and no error', () => {
    const toggleAction = vi.fn()
    const { result } = renderHook(() => useAsyncToggle(true, toggleAction))

    expect(result.current.enabled).toBe(true)
    expect(result.current.error).toBeNull()
    expect(result.current.isPending).toBe(false)
  })

  it('flips enabled and calls the action with the next value on toggle', async () => {
    const toggleAction = vi.fn().mockResolvedValue({ success: true })
    const { result } = renderHook(() => useAsyncToggle(false, toggleAction))

    act(() => result.current.toggle())

    await waitFor(() => expect(result.current.enabled).toBe(true))
    expect(toggleAction).toHaveBeenCalledWith(true)
    expect(result.current.error).toBeNull()
  })

  it('toggles back and forth across repeated calls', async () => {
    const toggleAction = vi.fn().mockResolvedValue({ success: true })
    const { result } = renderHook(() => useAsyncToggle(false, toggleAction))

    act(() => result.current.toggle())
    await waitFor(() => expect(result.current.enabled).toBe(true))

    act(() => result.current.toggle())
    await waitFor(() => expect(result.current.enabled).toBe(false))

    expect(toggleAction).toHaveBeenNthCalledWith(1, true)
    expect(toggleAction).toHaveBeenNthCalledWith(2, false)
  })

  it('sets error and leaves enabled unchanged when the action fails', async () => {
    const toggleAction = vi.fn().mockResolvedValue({ success: false, error: 'Not authorized' })
    const { result } = renderHook(() => useAsyncToggle(false, toggleAction))

    act(() => result.current.toggle())

    await waitFor(() => expect(result.current.error).toBe('Not authorized'))
    expect(result.current.enabled).toBe(false)
  })

  it('clears a previous error on a new toggle attempt', async () => {
    const toggleAction = vi.fn()
      .mockResolvedValueOnce({ success: false, error: 'Not authorized' })
      .mockResolvedValueOnce({ success: true })
    const { result } = renderHook(() => useAsyncToggle(false, toggleAction))

    act(() => result.current.toggle())
    await waitFor(() => expect(result.current.error).toBe('Not authorized'))

    act(() => result.current.toggle())
    await waitFor(() => expect(result.current.enabled).toBe(true))
    expect(result.current.error).toBeNull()
  })
})
