'use client'

import { useState } from 'react'
import { updateLink, type LinkWithTags } from '@/lib/services/links'
import { useVault } from '@/lib/context/VaultContext'
import { useTagNameLookup } from '@/lib/hooks/tags/useTagNameLookup'
import { DEFAULT_FIELDS, useLinkForm } from './useLinkForm'

function toFormState(link: LinkWithTags, tagNameById: Map<string, string>) {
  return {
    url: link.url,
    title: link.title ?? '',
    description: link.description ?? '',
    imageUrl: link.image_url ?? '',
    duration: link.duration ?? '',
    categoryId: link.category_id,
    status: link.status,
    tags: link.tags.map(id => tagNameById.get(id)).filter((name): name is string => !!name).join(', '),
    notes: link.notes ?? '',
  }
}

type FormState = ReturnType<typeof toFormState>

function tagSet(raw: string): Set<string> {
  return new Set(raw.split(',').map(t => t.trim()).filter(Boolean))
}

// Compares the way handleSubmit saves: text fields trimmed (so '' and null match),
// tags as a set of names (so reordering or a stray comma isn't a change).
function differsFrom(current: FormState, initial: FormState): boolean {
  const textFields = ['title', 'description', 'imageUrl', 'duration', 'notes'] as const
  if (textFields.some(k => current[k].trim() !== initial[k].trim())) return true
  if (current.categoryId !== initial.categoryId || current.status !== initial.status) return true
  const a = tagSet(current.tags), b = tagSet(initial.tags)
  return a.size !== b.size || [...a].some(t => !b.has(t))
}

export function useEditLinkForm(link: LinkWithTags | null) {
  const { dek } = useVault()
  const tagNameById = useTagNameLookup()
  // Captured once, like the form's own initial state, so the tag lookup resolving
  // later can't make an untouched form look changed.
  const [initial] = useState<FormState>(() => (link ? toFormState(link, tagNameById) : DEFAULT_FIELDS))
  const form = useLinkForm(initial)
  const hasChanges = differsFrom(form, initial)

  async function handleSubmit(): Promise<LinkWithTags | null> {
    if (!link || !dek) return null
    return form.wrapSubmit(
      () => updateLink({
        id: link.id,
        // A saved link's URL is immutable -- to point at a different URL, delete the
        // link and save a new one.
        url: link.url,
        title: form.resolvedTitle,
        description: form.description || null,
        image_url: form.imageUrl || null,
        duration: form.duration || null,
        category_id: form.categoryId!,
        status: form.status,
        notes: form.notes || null,
        tags: form.parsedTags,
      }, dek),
      'Failed to save changes. Please try again.',
    )
  }

  return { ...form, handleSubmit, hasChanges }
}
