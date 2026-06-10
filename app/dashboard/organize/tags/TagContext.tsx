'use client'

import { createContext, useContext } from 'react'
import { useTagList } from '@/lib/hooks/tags/useTagList'

type TagContextValue = ReturnType<typeof useTagList>

const TagContext = createContext<TagContextValue | null>(null)

export function TagProvider({ children }: { children: React.ReactNode }) {
  const value = useTagList()
  return <TagContext.Provider value={value}>{children}</TagContext.Provider>
}

export function useTagContext(): TagContextValue {
  const ctx = useContext(TagContext)
  if (!ctx) throw new Error('useTagContext must be used within TagProvider')
  return ctx
}
