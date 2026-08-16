'use client'

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

export function useEditLinkForm(link: LinkWithTags | null) {
  const { dek } = useVault()
  const tagNameById = useTagNameLookup()
  const form = useLinkForm(link ? toFormState(link, tagNameById) : DEFAULT_FIELDS)

  async function handleSubmit(): Promise<LinkWithTags | null> {
    if (!link || !dek) return null
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
      }, dek),
      'Failed to save changes. Please try again.',
    )
  }

  return { ...form, handleSubmit }
}
