'use client'

import { useState } from 'react'
import type { LinkWithTags } from '@/lib/services/links'

export function useLinkModals() {
  const [modalOpen, setModalOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [activeLink, setActiveLink] = useState<LinkWithTags | null>(null)
  const [editingLink, setEditingLink] = useState<LinkWithTags | null>(null)

  return { modalOpen, setModalOpen, filterOpen, setFilterOpen, activeLink, setActiveLink, editingLink, setEditingLink }
}
