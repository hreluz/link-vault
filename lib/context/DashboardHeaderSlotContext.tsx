'use client'

import { createContext, useContext, useState } from 'react'

// Lets a page put controls into DashboardHeader without the header knowing
// about them: the header registers an empty slot element, and the page
// portals into it (SPEC 36: the link list's Undo button).
type DashboardHeaderSlot = {
  slot: HTMLElement | null
  setSlot: (el: HTMLElement | null) => void
}

const DashboardHeaderSlotContext = createContext<DashboardHeaderSlot>({
  slot: null,
  setSlot: () => {},
})

export function DashboardHeaderSlotProvider({ children }: { children: React.ReactNode }) {
  const [slot, setSlot] = useState<HTMLElement | null>(null)
  return (
    <DashboardHeaderSlotContext.Provider value={{ slot, setSlot }}>
      {children}
    </DashboardHeaderSlotContext.Provider>
  )
}

export function useDashboardHeaderSlot() {
  return useContext(DashboardHeaderSlotContext)
}
