'use client'

import { useState, useEffect } from 'react'
import type { ContentType, LinkStatus } from '@/lib/types/database'
import { updateLink, type LinkWithTags } from '@/lib/services/links'

function parseTags(raw: string): string[] {
  return raw.split(',').map(t => t.trim()).filter(Boolean)
}

export function useEditLinkForm(link: LinkWithTags | null) {
  const [url, setUrl] = useState(link?.url ?? '')
  const [title, setTitle] = useState(link?.title ?? '')
  const [description, setDescription] = useState(link?.description ?? '')
  const [contentType, setContentType] = useState<ContentType>(link?.content_type ?? 'other')
  const [status, setStatus] = useState<LinkStatus>(link?.status ?? 'unread')
  const [tags, setTags] = useState(link?.tags.join(', ') ?? '')
  const [notes, setNotes] = useState(link?.notes ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!link) return
    setUrl(link.url)
    setTitle(link.title ?? '')
    setDescription(link.description ?? '')
    setContentType(link.content_type)
    setStatus(link.status)
    setTags(link.tags.join(', '))
    setNotes(link.notes ?? '')
    setError(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [link?.id])

  async function handleSubmit(): Promise<LinkWithTags | null> {
    if (!link) return null
    if (!url.trim()) {
      setError('URL is required.')
      return null
    }
    try { new URL(url) } catch {
      setError('Please enter a valid URL (e.g. https://example.com).')
      return null
    }
    setSubmitting(true)
    setError(null)
    const resolvedTitle = title.trim() || url.replace(/^https?:\/\//, '').slice(0, 30)
    const updated = await updateLink({
      id: link.id,
      url,
      title: resolvedTitle,
      description: description || null,
      content_type: contentType,
      status,
      notes: notes || null,
      tags: parseTags(tags),
    })
    setSubmitting(false)
    if (!updated) {
      setError('Failed to save changes. Please try again.')
      return null
    }
    return updated
  }

  return {
    url, setUrl,
    title, setTitle,
    description, setDescription,
    contentType, setContentType,
    status, setStatus,
    tags, setTags,
    notes, setNotes,
    submitting,
    error,
    handleSubmit,
  }
}
