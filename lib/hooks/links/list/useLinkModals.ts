'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { LinkWithTags } from '@/lib/services/links'

export type PendingCapture = { url: string; title: string }

export function useLinkModals() {
  const [modalOpen, setModalOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [activeLink, setActiveLink] = useState<LinkWithTags | null>(null)
  const [editingLink, setEditingLink] = useState<LinkWithTags | null>(null)
  const [pendingCapture, setPendingCapture] = useState<PendingCapture | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get('add') !== '1') return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPendingCapture({ url: searchParams.get('url') ?? '', title: searchParams.get('title') ?? '' })
    setModalOpen(true)
    router.replace('/dashboard', { scroll: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    modalOpen, setModalOpen, filterOpen, setFilterOpen, activeLink, setActiveLink, editingLink, setEditingLink,
    pendingCapture, setPendingCapture,
  }
}
