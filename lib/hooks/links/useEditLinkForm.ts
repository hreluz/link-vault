'use client'

import { updateLink, type LinkWithTags } from '@/lib/services/links'
import { DEFAULT_FIELDS, useLinkForm } from './useLinkForm'

function toFormState(link: LinkWithTags) {
  return {
    url: link.url,
    title: link.title ?? '',
    description: link.description ?? '',
    imageUrl: link.image_url ?? '',
    duration: link.duration ?? '',
    categoryId: link.category_id,
    status: link.status,
    tags: link.tags.join(', '),
    notes: link.notes ?? '',
  }
}

export function useEditLinkForm(link: LinkWithTags | null) {
  const form = useLinkForm(link ? toFormState(link) : DEFAULT_FIELDS)

  async function handleSubmit(): Promise<LinkWithTags | null> {
    if (!link) return null
    return form.wrapSubmit(
      () => updateLink({
        id: link.id,
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
      'Failed to save changes. Please try again.',
    )
  }

  return { ...form, handleSubmit }
}
