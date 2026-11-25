'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { LinkWithTags } from '@/lib/services/links'

export type PendingCapture = { url: string; title: string }

/** Where the collection picker was opened from, so focus can go back there (SPEC 46). */
export type CollectionPickerOrigin = 'menu' | 'more'

export function useLinkModals() {
  const [modalOpen, setModalOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [activeLink, setActiveLink] = useState<LinkWithTags | null>(null)
  const [editingLink, setEditingLink] = useState<LinkWithTags | null>(null)
  const [pendingCapture, setPendingCapture] = useState<PendingCapture | null>(null)
  const [pickerLink, setPickerLink] = useState<LinkWithTags | null>(null)
  const [pickerOrigin, setPickerOrigin] = useState<CollectionPickerOrigin>('menu')
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

  function openCollectionPicker(link: LinkWithTags, origin: CollectionPickerOrigin) {
    setPickerOrigin(origin)
    setPickerLink(link)
  }

  function closeCollectionPicker() {
    setPickerLink(null)
  }

  return {
    modalOpen, setModalOpen, filterOpen, setFilterOpen, activeLink, setActiveLink, editingLink, setEditingLink,
    pendingCapture, setPendingCapture,
    pickerLink, pickerOrigin, openCollectionPicker, closeCollectionPicker,
  }
}
