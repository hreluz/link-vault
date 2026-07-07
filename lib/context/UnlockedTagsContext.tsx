'use client'

import { createContext, useContext, useState } from 'react'

type UnlockedTagsContextType = {
  unlockedTagIds: Set<string>
  unlockTag: (id: string) => void
  lockTag: (id: string) => void
  lockAll: () => void
}

const UnlockedTagsContext = createContext<UnlockedTagsContextType>({
  unlockedTagIds: new Set(),
  unlockTag: () => {},
  lockTag: () => {},
  lockAll: () => {},
})

export function UnlockedTagsProvider({ children }: { children: React.ReactNode }) {
  const [unlockedTagIds, setUnlockedTagIds] = useState<Set<string>>(new Set())

  function unlockTag(id: string) {
    setUnlockedTagIds(prev => { const next = new Set(prev); next.add(id); return next })
  }

  function lockTag(id: string) {
    setUnlockedTagIds(prev => { const next = new Set(prev); next.delete(id); return next })
  }

  function lockAll() {
    setUnlockedTagIds(new Set())
  }

  return (
    <UnlockedTagsContext.Provider value={{ unlockedTagIds, unlockTag, lockTag, lockAll }}>
      {children}
    </UnlockedTagsContext.Provider>
  )
}

export function useUnlockedTags() {
  return useContext(UnlockedTagsContext)
}
