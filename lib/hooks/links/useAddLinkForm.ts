'use client'

import { createLink, type LinkWithTags } from '@/lib/services/links'
import { DEFAULT_FIELDS, useLinkForm } from './useLinkForm'

export function useAddLinkForm() {
  const form = useLinkForm(DEFAULT_FIELDS)

  async function handleSubmit(): Promise<LinkWithTags | null> {
    const result = await form.wrapSubmit(
      () => createLink({
        url: form.url,
        title: form.resolvedTitle,
        content_type: form.contentType,
        status: form.status,
        notes: form.notes || null,
        tags: form.parsedTags,
      }),
      'Failed to save link. Please try again.',
    )
    if (result) form.reset()
    return result
  }

  return { ...form, handleSubmit }
}
