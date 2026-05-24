'use client'

import { useState } from 'react'
import type { ContentType, LinkStatus } from '@/lib/types/database'
import { updateLink, type LinkWithTags } from '@/lib/services/links'

function parseTags(raw: string): string[] {
  return raw.split(',').map(t => t.trim()).filter(Boolean)
}

type FormState = {
  url: string
  title: string
  description: string
  contentType: ContentType
  status: LinkStatus
  tags: string
  notes: string
  error: string | null
}

function toFormState(link: LinkWithTags): FormState {
  return {
    url: link.url,
    title: link.title ?? '',
    description: link.description ?? '',
    contentType: link.content_type,
    status: link.status,
    tags: link.tags.join(', '),
    notes: link.notes ?? '',
    error: null,
  }
}

const EMPTY_FORM: FormState = {
  url: '',
  title: '',
  description: '',
  contentType: 'other',
  status: 'unread',
  tags: '',
  notes: '',
  error: null,
}

export function useEditLinkForm(link: LinkWithTags | null) {
  const [form, setForm] = useState<FormState>(link ? toFormState(link) : EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(): Promise<LinkWithTags | null> {
    if (!link) return null
    if (!form.url.trim()) {
      setForm(f => ({ ...f, error: 'URL is required.' }))
      return null
    }
    try { new URL(form.url) } catch {
      setForm(f => ({ ...f, error: 'Please enter a valid URL (e.g. https://example.com).' }))
      return null
    }
    setSubmitting(true)
    setForm(f => ({ ...f, error: null }))
    const resolvedTitle = form.title.trim() || form.url.replace(/^https?:\/\//, '').slice(0, 30)
    const updated = await updateLink({
      id: link.id,
      url: form.url,
      title: resolvedTitle,
      description: form.description || null,
      content_type: form.contentType,
      status: form.status,
      notes: form.notes || null,
      tags: parseTags(form.tags),
    })
    setSubmitting(false)
    if (!updated) {
      setForm(f => ({ ...f, error: 'Failed to save changes. Please try again.' }))
      return null
    }
    return updated
  }

  return {
    url: form.url, setUrl: (url: string) => setForm(f => ({ ...f, url })),
    title: form.title, setTitle: (title: string) => setForm(f => ({ ...f, title })),
    description: form.description, setDescription: (description: string) => setForm(f => ({ ...f, description })),
    contentType: form.contentType, setContentType: (contentType: ContentType) => setForm(f => ({ ...f, contentType })),
    status: form.status, setStatus: (status: LinkStatus) => setForm(f => ({ ...f, status })),
    tags: form.tags, setTags: (tags: string) => setForm(f => ({ ...f, tags })),
    notes: form.notes, setNotes: (notes: string) => setForm(f => ({ ...f, notes })),
    submitting,
    error: form.error,
    handleSubmit,
  }
}
