'use client'

import { useMemo } from 'react'
import { useTagsContext } from '@/lib/context/TagsContext'
import { useUnlockedTags } from '@/lib/context/UnlockedTagsContext'
import { isTagVisible } from '@/lib/services/tags/tags'

/** Visible tag names, for typing/autocomplete contexts (tag input, search box hashtags). */
export function useAvailableTags(): string[] {
  const { tags } = useTagsContext()
  const { unlockedTagIds } = useUnlockedTags()

  return useMemo(
    () => tags.filter(t => isTagVisible(t.is_private, t.id, unlockedTagIds)).map(t => t.name),
    [tags, unlockedTagIds],
  )
}

/** Visible tags as id+name pairs, for selection UIs (e.g. FilterSheet) that filter by tag id. */
export function useAvailableTagsWithIds(): { id: string; name: string; is_private: boolean }[] {
  const { tags } = useTagsContext()
  const { unlockedTagIds } = useUnlockedTags()

  return useMemo(
    () => tags.filter(t => isTagVisible(t.is_private, t.id, unlockedTagIds)).map(t => ({ id: t.id, name: t.name, is_private: t.is_private })),
    [tags, unlockedTagIds],
  )
}
