'use client'

import { useState, useEffect } from 'react'
import { getTags, type TagWithCount } from '@/lib/services/tags'

export function useTagListState(dek: CryptoKey | null) {
  const [tags, setTags] = useState<TagWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!dek) return
    getTags(dek).then(data => {
      setTags(data)
      setLoading(false)
    })
  }, [dek])

  return { tags, setTags, loading, search, setSearch }
}
