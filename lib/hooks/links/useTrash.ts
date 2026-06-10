'use client'

import { useEffect, useState, useMemo } from 'react'
import { getTrashedLinks, restoreLink, deleteLinkPermanently, emptyTrash, type TrashedLink } from '@/lib/services/trash'

export function useTrash() {
  const [links, setLinks] = useState<TrashedLink[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    getTrashedLinks().then(data => {
      setLinks(data)
      setLoading(false)
    })
  }, [])

  const filteredLinks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return links
    return links.filter(link =>
      link.title?.toLowerCase().includes(q) ||
      link.description?.toLowerCase().includes(q) ||
      link.site_name?.toLowerCase().includes(q) ||
      link.tags.some(t => t.toLowerCase().includes(q))
    )
  }, [links, searchQuery])

  async function handleRestore(id: string) {
    const ok = await restoreLink(id)
    if (ok) setLinks(prev => prev.filter(l => l.id !== id))
  }

  async function handleDeletePermanently(id: string) {
    const ok = await deleteLinkPermanently(id)
    if (ok) setLinks(prev => prev.filter(l => l.id !== id))
  }

  async function handleEmptyTrash() {
    const ok = await emptyTrash()
    if (ok) setLinks([])
  }

  return {
    links: filteredLinks,
    totalCount: links.length,
    loading,
    searchQuery,
    setSearchQuery,
    handleRestore,
    handleDeletePermanently,
    handleEmptyTrash,
  }
}
