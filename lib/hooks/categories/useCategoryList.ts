'use client'

import { useState, useEffect } from 'react'
import { getCategories, type Category } from '@/lib/services/categories'
import { useVault } from '@/lib/context/VaultContext'

export function useCategoryList() {
  const { dek } = useVault()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!dek) return
    getCategories(dek).then(data => {
      setCategories(data)
      setLoading(false)
    })
  }, [dek])

  return { categories, loading }
}
