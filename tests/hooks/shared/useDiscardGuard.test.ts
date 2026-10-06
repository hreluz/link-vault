// @vitest-environment jsdom

import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDiscardGuard } from '@/lib/hooks/shared/useDiscardGuard'

describe('useDiscardGuard', () => {
  it('starts without a confirm prompt', () => {
    const { result } = renderHook(() => useDiscardGuard(true, vi.fn()))
    expect(result.current.confirming).toBe(false)
  })

  it('closes straight away when there are no changes', () => {
    const onClose = vi.fn()
    const { result } = renderHook(() => useDiscardGuard(false, onClose))

    act(() => result.current.requestClose())

    expect(onClose).toHaveBeenCalledOnce()
    expect(result.current.confirming).toBe(false)
  })

  it('asks first instead of closing when there are changes', () => {
    const onClose = vi.fn()
    const { result } = renderHook(() => useDiscardGuard(true, onClose))

    act(() => result.current.requestClose())

    expect(onClose).not.toHaveBeenCalled()
    expect(result.current.confirming).toBe(true)
  })

  it('keepEditing hides the prompt without closing', () => {
    const onClose = vi.fn()
    const { result } = renderHook(() => useDiscardGuard(true, onClose))

    act(() => result.current.requestClose())
    act(() => result.current.keepEditing())

    expect(onClose).not.toHaveBeenCalled()
    expect(result.current.confirming).toBe(false)
  })

  it('discard closes and hides the prompt', () => {
    const onClose = vi.fn()
    const { result } = renderHook(() => useDiscardGuard(true, onClose))

    act(() => result.current.requestClose())
    act(() => result.current.discard())

    expect(onClose).toHaveBeenCalledOnce()
    expect(result.current.confirming).toBe(false)
  })
})
