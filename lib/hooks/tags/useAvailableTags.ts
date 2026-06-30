'use client'

import { useMemo } from 'react'
import { useTagsContext } from '@/lib/context/TagsContext'
import { useUnlockedTags } from '@/lib/context/UnlockedTagsContext'
import { isTagVisible } from '@/lib/services/tags'

export function useAvailableTags(): string[] {
  const { tags } = useTagsContext()
  const { unlockedTagNames } = useUnlockedTags()

  return useMemo(
    () => tags.filter(t => isTagVisible(t.is_private, t.name, unlockedTagNames)).map(t => t.name),
    [tags, unlockedTagNames],
  )
}
