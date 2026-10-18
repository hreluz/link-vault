'use client'

import { useState, useEffect } from 'react'
import { getCategories, type Category } from '@/lib/services/categories'
import { useVault } from '@/lib/context/VaultContext'

/** `reloadKey`: bump it to refetch (e.g. after the link list's refresh button). */
export function useCategoryList(reloadKey = 0) {
  const { dek } = useVault()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!dek) return
    getCategories(dek).then(data => {
      setCategories(data)
      setLoading(false)
    })
  }, [dek, reloadKey])

  return { categories, loading }
}
