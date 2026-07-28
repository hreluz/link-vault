'use client'

import { useEffect, useRef, useState } from 'react'
import { createLink, findLinkIdByUrl, type LinkWithTags } from '@/lib/services/links'
import { fetchLinkMeta } from '@/app/dashboard/link/actions'
import { useVault } from '@/lib/context/VaultContext'
import { DEFAULT_FIELDS, useLinkForm } from './useLinkForm'

function isValidUrl(url: string): boolean {
  try { new URL(url); return true } catch { return false }
}

export function useAddLinkForm(initialUrl?: string, initialTitle?: string, isOpen?: boolean, autoFetchDefault = true) {
  const { dek } = useVault()
  const form = useLinkForm({ ...DEFAULT_FIELDS, url: initialUrl ?? '', title: initialTitle ?? '' })
  const [autoFetch, setAutoFetch] = useState(autoFetchDefault)
  const [duplicateLinkId, setDuplicateLinkId] = useState<string | null>(null)
  const titleTouchedRef = useRef(false)
  const lastFetchedUrlRef = useRef('')
  const wasOpenRef = useRef(isOpen)

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      form.reset()
      if (initialUrl) form.setUrl(initialUrl)
      if (initialTitle) form.setTitle(initialTitle)
      setAutoFetch(autoFetchDefault)
      titleTouchedRef.current = false
      lastFetchedUrlRef.current = ''
    }
    wasOpenRef.current = isOpen
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  useEffect(() => {
    const url = form.url.trim()
    // Only reset once a *new* url is actually about to be checked -- not on every url
    // change, since clearing the url ourselves after finding a duplicate (below) would
    // otherwise immediately null this out again and the note would never be visible.
    if (!url || !isValidUrl(url)) return
    setDuplicateLinkId(null)

    const timer = setTimeout(async () => {
      if (dek) {
        const existingId = await findLinkIdByUrl(url, dek)
        if (existingId) {
          setDuplicateLinkId(existingId)
          form.setUrl('')
          return // skip the og:meta fetch entirely for a link we already have
        }
      }

      if (!autoFetch || url === lastFetchedUrlRef.current) return
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
  }, [form.url, autoFetch, dek])

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
    if (!dek) return null

    const trimmedUrl = form.url.trim()
    if (isValidUrl(trimmedUrl)) {
      form.setSubmitting(true)
      const existingId = await findLinkIdByUrl(trimmedUrl, dek)
      if (existingId) {
        form.setSubmitting(false)
        form.setError('A link with this URL already exists.')
        return null
      }
    }

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
      }, dek),
      'Failed to save link. Please try again.',
    )
    if (result) {
      form.reset()
      titleTouchedRef.current = false
      lastFetchedUrlRef.current = ''
    }
    return result
  }

  return { ...form, handleSubmit, handleTitleChange, autoFetch, toggleAutoFetch, duplicateLinkId }
}
