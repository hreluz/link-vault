'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  getCategoryDomains,
  addCategoryDomain,
  removeCategoryDomain,
  type CategoryDomain,
} from '@/lib/services/category-domains'

export function useCategoryDomains(categoryId: string) {
  const [domains, setDomains] = useState<CategoryDomain[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const data = await getCategoryDomains(categoryId)
    setDomains(data)
    setLoading(false)
  }, [categoryId])

  useEffect(() => { load() }, [load])

  async function add(rawDomain: string): Promise<boolean> {
    setError(null)
    const result = await addCategoryDomain(categoryId, rawDomain)
    if (result.error === 'domain_taken') {
      setError('That domain is already assigned to a category.')
      return false
    }
    if (result.error === 'invalid_domain') {
      setError('Enter a valid domain (e.g. example.com).')
      return false
    }
    if (result.error) {
      setError('Failed to add domain.')
      return false
    }
    setDomains(prev => [...prev, result.data].sort((a, b) => a.domain.localeCompare(b.domain)))
    return true
  }

  async function remove(id: string): Promise<void> {
    const ok = await removeCategoryDomain(id)
    if (ok) setDomains(prev => prev.filter(d => d.id !== id))
  }

  return { domains, loading, error, add, remove }
}
