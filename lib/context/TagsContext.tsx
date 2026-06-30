'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { getTags, type TagWithCount } from '@/lib/services/tags'

type TagsContextType = {
  tags: TagWithCount[]
  loading: boolean
  refetchTags: () => void
}

const TagsContext = createContext<TagsContextType>({
  tags: [],
  loading: true,
  refetchTags: () => {},
})

export function TagsProvider({ children }: { children: React.ReactNode }) {
  const [tags, setTags] = useState<TagWithCount[]>([])
  const [loading, setLoading] = useState(true)

  const refetchTags = useCallback(() => {
    getTags().then(data => {
      setTags(data)
      setLoading(false)
    })
  }, [])

  useEffect(() => { refetchTags() }, [refetchTags])

  return (
    <TagsContext.Provider value={{ tags, loading, refetchTags }}>
      {children}
    </TagsContext.Provider>
  )
}

export function useTagsContext() {
  return useContext(TagsContext)
}
