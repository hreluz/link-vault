'use client'

import { useEffect, useState, useMemo } from 'react'
import { getTrashedLinks, restoreLink, deleteLinkPermanently, emptyTrash, type TrashedLink } from '@/lib/services/trash'
import { useVault } from '@/lib/context/VaultContext'
import { useTagsContext } from '@/lib/context/TagsContext'

export function useTrash() {
  const { dek } = useVault()
  const { tags: allTags } = useTagsContext()
  const [links, setLinks] = useState<TrashedLink[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (!dek) return
    getTrashedLinks(dek).then(data => {
      setLinks(data)
      setLoading(false)
    })
  }, [dek])

  const filteredLinks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return links
    return links.filter(link =>
      link.title?.toLowerCase().includes(q) ||
      link.description?.toLowerCase().includes(q) ||
      link.site_name?.toLowerCase().includes(q) ||
      link.tags.some(id => (allTags.find(t => t.id === id)?.name ?? '').toLowerCase().includes(q))
    )
  }, [links, searchQuery, allTags])

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
