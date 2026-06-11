'use client'

import { useEffect, useRef } from 'react'
import { PROTECTED_CATEGORY_NAME } from '@/lib/services/categories'
import { getCategoryIdByDomain } from '@/lib/services/category-domains'
import type { Category } from '@/lib/services/categories'

type FormSlice = {
  url: string
  categoryId: string | null
  setCategoryId: (id: string | null) => void
}

export function useAutoAssignCategory(
  form: FormSlice,
  categories: Category[],
  active: boolean,
) {
  const notDefinedId = useRef<string | null>(null)
  const autoAssignedId = useRef<string | null>(null)

  useEffect(() => {
    if (!active || categories.length === 0) return
    const notDefined = categories.find(c => c.name === PROTECTED_CATEGORY_NAME)
    if (notDefined) {
      notDefinedId.current = notDefined.id
      form.setCategoryId(notDefined.id)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, categories])

  useEffect(() => {
    if (!form.url) return
    let cancelled = false
    try {
      const hostname = new URL(form.url).hostname
      getCategoryIdByDomain(hostname).then(id => {
        if (cancelled) return
        const isAutoOrDefault =
          form.categoryId === notDefinedId.current ||
          form.categoryId === autoAssignedId.current
        if (!isAutoOrDefault) return
        const next = id ?? notDefinedId.current
        if (next) {
          autoAssignedId.current = id ?? null
          form.setCategoryId(next)
        }
      })
    } catch { /* invalid url */ }
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.url])
}
