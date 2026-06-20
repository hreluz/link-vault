'use client'

import { useState, useCallback } from 'react'

export function useLinksSelection() {
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const enterSelectionMode = useCallback(() => setIsSelectionMode(true), [])

  const exitSelectionMode = useCallback(() => {
    setIsSelectionMode(false)
    setSelectedIds(new Set())
  }, [])

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids))
  }, [])

  const clearAll = useCallback(() => setSelectedIds(new Set()), [])

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds])

  return {
    isSelectionMode,
    selectedIds,
    selectedCount: selectedIds.size,
    enterSelectionMode,
    exitSelectionMode,
    toggleSelected,
    selectAll,
    clearAll,
    isSelected,
  }
}
