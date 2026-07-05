'use client'

import { useMemo } from 'react'
import { useTagsContext } from '@/lib/context/TagsContext'

/**
 * Unfiltered tag id -> name map, for resolving names on already-visible links/tags
 * (private-tag filtering has already happened upstream by the time these are rendered).
 * Not privacy-aware -- use `useAvailableTagsWithIds()` where a since-locked tag's name
 * must not leak (e.g. the active-filter-chips strip).
 */
export function useTagNameLookup(): Map<string, string> {
  const { tags } = useTagsContext()
  return useMemo(() => new Map(tags.map(t => [t.id, t.name])), [tags])
}
