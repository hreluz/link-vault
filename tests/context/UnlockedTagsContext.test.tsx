// @vitest-environment jsdom

import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import React from 'react'
import { UnlockedTagsProvider, useUnlockedTags } from '@/lib/context/UnlockedTagsContext'

function wrapper({ children }: { children: React.ReactNode }) {
  return <UnlockedTagsProvider>{children}</UnlockedTagsProvider>
}

describe('UnlockedTagsContext', () => {
  describe('initial state', () => {
    it('starts with no unlocked tags', () => {
      const { result } = renderHook(() => useUnlockedTags(), { wrapper })
      expect(result.current.unlockedTagNames.size).toBe(0)
    })
  })

  describe('unlockTag', () => {
    it('adds the tag name to the unlocked set', () => {
      const { result } = renderHook(() => useUnlockedTags(), { wrapper })

      act(() => result.current.unlockTag('secret'))

      expect(result.current.unlockedTagNames.has('secret')).toBe(true)
    })

    it('can unlock multiple tags independently', () => {
      const { result } = renderHook(() => useUnlockedTags(), { wrapper })

      act(() => {
        result.current.unlockTag('secret')
        result.current.unlockTag('work')
      })

      expect(result.current.unlockedTagNames.has('secret')).toBe(true)
      expect(result.current.unlockedTagNames.has('work')).toBe(true)
    })

    it('is idempotent — unlocking the same tag twice has no effect', () => {
      const { result } = renderHook(() => useUnlockedTags(), { wrapper })

      act(() => {
        result.current.unlockTag('secret')
        result.current.unlockTag('secret')
      })

      expect(result.current.unlockedTagNames.size).toBe(1)
    })
  })

  describe('lockTag', () => {
    it('removes the tag name from the unlocked set', () => {
      const { result } = renderHook(() => useUnlockedTags(), { wrapper })

      act(() => result.current.unlockTag('secret'))
      act(() => result.current.lockTag('secret'))

      expect(result.current.unlockedTagNames.has('secret')).toBe(false)
    })

    it('does not affect other unlocked tags', () => {
      const { result } = renderHook(() => useUnlockedTags(), { wrapper })

      act(() => {
        result.current.unlockTag('secret')
        result.current.unlockTag('work')
      })
      act(() => result.current.lockTag('secret'))

      expect(result.current.unlockedTagNames.has('work')).toBe(true)
      expect(result.current.unlockedTagNames.has('secret')).toBe(false)
    })

    it('is a no-op when the tag is not unlocked', () => {
      const { result } = renderHook(() => useUnlockedTags(), { wrapper })

      act(() => result.current.lockTag('never-unlocked'))

      expect(result.current.unlockedTagNames.size).toBe(0)
    })
  })

  describe('lockAll', () => {
    it('clears all unlocked tags at once', () => {
      const { result } = renderHook(() => useUnlockedTags(), { wrapper })

      act(() => {
        result.current.unlockTag('secret')
        result.current.unlockTag('work')
        result.current.unlockTag('personal')
      })
      act(() => result.current.lockAll())

      expect(result.current.unlockedTagNames.size).toBe(0)
    })

    it('is a no-op when nothing is unlocked', () => {
      const { result } = renderHook(() => useUnlockedTags(), { wrapper })

      act(() => result.current.lockAll())

      expect(result.current.unlockedTagNames.size).toBe(0)
    })
  })

  describe('default context (no provider)', () => {
    it('returns an empty set when used outside a provider', () => {
      const { result } = renderHook(() => useUnlockedTags())
      expect(result.current.unlockedTagNames.size).toBe(0)
    })
  })
})
