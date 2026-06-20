'use client'

import { useEffect, useRef, useState } from 'react'
import { createLink, type LinkWithTags } from '@/lib/services/links'
import { fetchLinkMeta } from '@/app/dashboard/link/actions'
import { DEFAULT_FIELDS, useLinkForm } from './useLinkForm'

function isValidUrl(url: string): boolean {
  try { new URL(url); return true } catch { return false }
}

export function useAddLinkForm() {
  const form = useLinkForm(DEFAULT_FIELDS)
  const [autoFetch, setAutoFetch] = useState(true)
  const titleTouchedRef = useRef(false)
  const lastFetchedUrlRef = useRef('')

  useEffect(() => {
    if (!autoFetch) return

    const url = form.url.trim()
    if (!url || !isValidUrl(url) || url === lastFetchedUrlRef.current) return

    const timer = setTimeout(async () => {
      lastFetchedUrlRef.current = url
      form.setFetchingMeta(true)
      const meta = await fetchLinkMeta(url)
      form.setFetchingMeta(false)

      if (!titleTouchedRef.current && meta.title) form.setTitle(meta.title)
      if (meta.description) form.setDescription(meta.description)
      if (meta.image) form.setImageUrl(meta.image)
      if (meta.duration) form.setDuration(meta.duration)
    }, 600)

    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.url, autoFetch])

  function toggleAutoFetch() {
    const next = !autoFetch
    setAutoFetch(next)
    if (!next) {
      form.setFetchingMeta(false)
      form.setTitle('')
      form.setDescription('')
      form.setImageUrl('')
      form.setDuration('')
      titleTouchedRef.current = false
      lastFetchedUrlRef.current = ''
    } else {
      lastFetchedUrlRef.current = ''
    }
  }

  function handleTitleChange(value: string) {
    titleTouchedRef.current = value.length > 0
    form.setTitle(value)
  }

  async function handleSubmit(): Promise<LinkWithTags | null> {
    const result = await form.wrapSubmit(
      () => createLink({
        url: form.url,
        title: form.resolvedTitle,
        description: form.description || null,
        image_url: form.imageUrl || null,
        duration: form.duration || null,
        category_id: form.categoryId!,
        status: form.status,
        notes: form.notes || null,
        tags: form.parsedTags,
      }),
      'Failed to save link. Please try again.',
    )
    if (result) {
      form.reset()
      titleTouchedRef.current = false
      lastFetchedUrlRef.current = ''
    }
    return result
  }

  return { ...form, handleSubmit, handleTitleChange, autoFetch, toggleAutoFetch }
}
