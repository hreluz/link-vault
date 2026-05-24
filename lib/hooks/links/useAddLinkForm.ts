'use client'

import { useState } from 'react'
import type { ContentType, LinkStatus } from '@/lib/types/database'
import { createLink, type LinkWithTags } from '@/lib/services/links'

function parseTags(raw: string): string[] {
  return raw.split(',').map(t => t.trim()).filter(Boolean)
}

export function useAddLinkForm() {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [contentType, setContentType] = useState<ContentType>('other')
  const [status, setStatus] = useState<LinkStatus>('unread')
  const [tags, setTags] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setUrl('')
    setTitle('')
    setContentType('other')
    setStatus('unread')
    setTags('')
    setNotes('')
    setError(null)
  }

  async function handleSubmit(): Promise<LinkWithTags | null> {
    if (!url.trim()) {
      setError('URL is required.')
      return null
    }
    setSubmitting(true)
    setError(null)
    const link = await createLink({
      url,
      title: title || null,
      content_type: contentType,
      status,
      notes: notes || null,
      tags: parseTags(tags),
    })
    setSubmitting(false)
    if (!link) {
      setError('Failed to save link. Please try again.')
      return null
    }
    reset()
    return link
  }

  return {
    url, setUrl,
    title, setTitle,
    contentType, setContentType,
    status, setStatus,
    tags, setTags,
    notes, setNotes,
    submitting,
    error,
    reset,
    handleSubmit,
  }
}
