'use client'

import { useState, useEffect } from 'react'
import { getTags } from '@/lib/services/tags'

export function useAvailableTags(): string[] {
  const [tagNames, setTagNames] = useState<string[]>([])

  useEffect(() => {
    getTags().then(tags => setTagNames(tags.map(t => t.name)))
  }, [])

  return tagNames
}
