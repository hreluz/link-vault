'use client'

import { createContext, useContext, useState } from 'react'

type UnlockedTagsContextType = {
  unlockedTagNames: Set<string>
  unlockTag: (name: string) => void
  lockTag: (name: string) => void
  lockAll: () => void
}

const UnlockedTagsContext = createContext<UnlockedTagsContextType>({
  unlockedTagNames: new Set(),
  unlockTag: () => {},
  lockTag: () => {},
  lockAll: () => {},
})

export function UnlockedTagsProvider({ children }: { children: React.ReactNode }) {
  const [unlockedTagNames, setUnlockedTagNames] = useState<Set<string>>(new Set())

  function unlockTag(name: string) {
    setUnlockedTagNames(prev => { const next = new Set(prev); next.add(name); return next })
  }

  function lockTag(name: string) {
    setUnlockedTagNames(prev => { const next = new Set(prev); next.delete(name); return next })
  }

  function lockAll() {
    setUnlockedTagNames(new Set())
  }

  return (
    <UnlockedTagsContext.Provider value={{ unlockedTagNames, unlockTag, lockTag, lockAll }}>
      {children}
    </UnlockedTagsContext.Provider>
  )
}

export function useUnlockedTags() {
  return useContext(UnlockedTagsContext)
}
