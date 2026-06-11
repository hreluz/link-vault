'use client'

import { createContext, useContext } from 'react'
import { useCategories } from '@/lib/hooks/categories/useCategories'

type CategoriesContextValue = ReturnType<typeof useCategories>

const CategoriesContext = createContext<CategoriesContextValue | null>(null)

export function CategoriesProvider({ children }: { children: React.ReactNode }) {
  const value = useCategories()
  return <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>
}

export function useCategoriesContext() {
  const ctx = useContext(CategoriesContext)
  if (!ctx) throw new Error('useCategoriesContext must be used within CategoriesProvider')
  return ctx
}
