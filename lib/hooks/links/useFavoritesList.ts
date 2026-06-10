'use client'

import { useState } from 'react'
import { useFavorites } from './useFavorites'
import { useLinkFilters } from './useLinkFilters'
import type { LinkWithTags } from '@/lib/services/links'

export function useFavoritesList() {
  const { links, loading, handleStatusChange, handleEdit, handleDelete, handleFavoriteToggle } = useFavorites()
  const filters = useLinkFilters(links)
  const [filterOpen, setFilterOpen] = useState(false)
  const [activeLink, setActiveLink] = useState<LinkWithTags | null>(null)
  const [editingLink, setEditingLink] = useState<LinkWithTags | null>(null)

  return {
    ...filters,
    links,
    loading,
    filterOpen, setFilterOpen,
    activeLink, setActiveLink,
    editingLink, setEditingLink,
    handleStatusChange,
    handleEdit,
    handleDelete,
    handleFavoriteToggle,
  }
}
