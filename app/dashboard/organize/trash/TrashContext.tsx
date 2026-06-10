'use client'

import { createContext, useContext } from 'react'
import { useTrash } from '@/lib/hooks/links/useTrash'

type TrashContextValue = ReturnType<typeof useTrash>

const TrashContext = createContext<TrashContextValue | null>(null)

export function TrashProvider({ children }: { children: React.ReactNode }) {
  const trash = useTrash()
  return <TrashContext.Provider value={trash}>{children}</TrashContext.Provider>
}

export function useTrashContext() {
  const ctx = useContext(TrashContext)
  if (!ctx) throw new Error('useTrashContext must be used within TrashProvider')
  return ctx
}
