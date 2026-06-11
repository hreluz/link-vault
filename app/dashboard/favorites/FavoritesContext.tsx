'use client'

import { createContext, useContext } from 'react'
import { useFavoritesList } from '@/lib/hooks/links'
import { useCategoryList } from '@/lib/hooks/categories/useCategoryList'
import type { Category } from '@/lib/services/categories'

type FavoritesContextValue = ReturnType<typeof useFavoritesList> & {
  categories: Category[]
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null)

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const favorites = useFavoritesList()
  const { categories } = useCategoryList()
  return (
    <FavoritesContext.Provider value={{ ...favorites, categories }}>
      {children}
    </FavoritesContext.Provider>
  )
}

export function useFavoritesContext() {
  const ctx = useContext(FavoritesContext)
  if (!ctx) throw new Error('useFavoritesContext must be used within FavoritesProvider')
  return ctx
}
