'use client'

import { useState } from 'react'
import type { ContentType, LinkStatus } from '@/lib/types/database'

function parseTags(raw: string): string[] {
  return raw.split(',').map(t => t.trim()).filter(Boolean)
}

type Fields = {
  url: string
  title: string
  description: string
  contentType: ContentType
  categoryId: string | null
  status: LinkStatus
  tags: string
  notes: string
}

export const DEFAULT_FIELDS: Fields = {
  url: '',
  title: '',
  description: '',
  contentType: 'other',
  categoryId: null,
  status: 'unread',
  tags: '',
  notes: '',
}

export function useLinkForm(initial: Fields = DEFAULT_FIELDS) {
  const [form, setForm] = useState<Fields & { error: string | null }>({ ...initial, error: null })
  const [submitting, setSubmitting] = useState(false)

  function validate(): boolean {
    if (!form.url.trim()) {
      setForm(f => ({ ...f, error: 'URL is required.' }))
      return false
    }
    try { new URL(form.url) } catch {
      setForm(f => ({ ...f, error: 'Please enter a valid URL (e.g. https://example.com).' }))
      return false
    }
    return true
  }

  function reset() {
    setForm({ ...DEFAULT_FIELDS, error: null })
  }

  async function wrapSubmit<T>(action: () => Promise<T | null>, failMsg: string): Promise<T | null> {
    if (!validate()) return null
    setSubmitting(true)
    setForm(f => ({ ...f, error: null }))
    const result = await action()
    setSubmitting(false)
    if (!result) {
      setForm(f => ({ ...f, error: failMsg }))
      return null
    }
    return result
  }

  return {
    url: form.url, setUrl: (url: string) => setForm(f => ({ ...f, url })),
    title: form.title, setTitle: (title: string) => setForm(f => ({ ...f, title })),
    description: form.description, setDescription: (description: string) => setForm(f => ({ ...f, description })),
    contentType: form.contentType, setContentType: (contentType: ContentType) => setForm(f => ({ ...f, contentType })),
    categoryId: form.categoryId, setCategoryId: (categoryId: string | null) => setForm(f => ({ ...f, categoryId })),
    status: form.status, setStatus: (status: LinkStatus) => setForm(f => ({ ...f, status })),
    tags: form.tags, setTags: (tags: string) => setForm(f => ({ ...f, tags })),
    notes: form.notes, setNotes: (notes: string) => setForm(f => ({ ...f, notes })),
    submitting,
    error: form.error,
    reset,
    wrapSubmit,
    parsedTags: parseTags(form.tags),
    resolvedTitle: form.title.trim() || form.url.replace(/^https?:\/\//, '').slice(0, 30),
  }
}
