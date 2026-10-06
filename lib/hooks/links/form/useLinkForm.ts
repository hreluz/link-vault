'use client'

import { useState } from 'react'
import type { LinkStatus } from '@/lib/types/database'

function parseTags(raw: string): string[] {
  return raw.split(',').map(t => t.trim()).filter(Boolean)
}

type Fields = {
  url: string
  title: string
  description: string
  imageUrl: string
  duration: string
  categoryId: string | null
  status: LinkStatus
  tags: string
  notes: string
}

export const DEFAULT_FIELDS: Fields = {
  url: '',
  title: '',
  description: '',
  imageUrl: '',
  duration: '',
  categoryId: null,
  status: 'unread',
  tags: '',
  notes: '',
}

export function useLinkForm(initial: Fields = DEFAULT_FIELDS) {
  const [form, setForm] = useState<Fields & { error: string | null }>({ ...initial, error: null })
  const [submitting, setSubmitting] = useState(false)
  const [fetchingMeta, setFetchingMeta] = useState(false)

  // Editing any field clears the error: it's one form-level message, and once the form
  // has changed it no longer describes it (the next submit re-validates everything).
  const setField = <K extends keyof Fields>(key: K) => (value: Fields[K]) =>
    setForm(f => ({ ...f, [key]: value, error: null }))

  function validate(): boolean {
    if (!form.url.trim()) {
      setForm(f => ({ ...f, error: 'URL is required.' }))
      return false
    }
    try { new URL(form.url) } catch {
      setForm(f => ({ ...f, error: 'Please enter a valid URL (e.g. https://example.com).' }))
      return false
    }
    if (!form.categoryId) {
      setForm(f => ({ ...f, error: 'Category is required.' }))
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
    url: form.url, setUrl: setField('url'),
    title: form.title, setTitle: setField('title'),
    description: form.description, setDescription: setField('description'),
    imageUrl: form.imageUrl, setImageUrl: setField('imageUrl'),
    duration: form.duration, setDuration: setField('duration'),
    categoryId: form.categoryId, setCategoryId: setField('categoryId'),
    status: form.status, setStatus: setField('status'),
    tags: form.tags, setTags: setField('tags'),
    notes: form.notes, setNotes: setField('notes'),
    submitting, setSubmitting,
    fetchingMeta, setFetchingMeta,
    error: form.error, setError: (error: string) => setForm(f => ({ ...f, error })),
    reset,
    wrapSubmit,
    parsedTags: parseTags(form.tags),
    resolvedTitle: form.title.trim() || form.url.replace(/^https?:\/\//, '').slice(0, 30),
  }
}
