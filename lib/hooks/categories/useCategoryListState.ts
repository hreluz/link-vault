'use client'

import { useState, useEffect } from 'react'
import { getCategories, type Category } from '@/lib/services/categories'

export function useCategoryListState(dek: CryptoKey | null) {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!dek) return
    getCategories(dek).then(data => {
      setCategories(data)
      setLoading(false)
    })
  }, [dek])

  const filteredCategories = categories.filter(c =>
    c.name.toLowerCase().includes(search.trim().toLowerCase())
  )

  return { categories, setCategories, loading, search, setSearch, filteredCategories }
}
