'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { getTags, type TagWithCount } from '@/lib/services/tags'
import { useVault } from '@/lib/context/VaultContext'

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
  const { dek } = useVault()
  const [tags, setTags] = useState<TagWithCount[]>([])
  const [loading, setLoading] = useState(true)

  const refetchTags = useCallback(() => {
    if (!dek) return
    getTags(dek).then(data => {
      setTags(data)
      setLoading(false)
    })
  }, [dek])

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
