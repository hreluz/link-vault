'use client'

import { useState, useEffect } from 'react'
import { getCategories, type Category } from '@/lib/services/categories'

export function useCategoryList() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCategories().then(data => {
      setCategories(data)
      setLoading(false)
    })
  }, [])

  return { categories, loading }
}
