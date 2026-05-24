'use client'

import { createContext, useContext } from 'react'
import { useLinkList } from '@/lib/hooks/links'

type LinkListContextValue = ReturnType<typeof useLinkList>

const LinkListContext = createContext<LinkListContextValue | null>(null)

export function LinkListProvider({ children }: { children: React.ReactNode }) {
  const value = useLinkList()
  return <LinkListContext.Provider value={value}>{children}</LinkListContext.Provider>
}

export function useLinkListContext() {
  const ctx = useContext(LinkListContext)
  if (!ctx) throw new Error('useLinkListContext must be used within LinkListProvider')
  return ctx
}
