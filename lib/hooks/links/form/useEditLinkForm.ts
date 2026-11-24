'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { updateLink, type LinkWithTags } from '@/lib/services/links'
import { getCollectionIdsForLink } from '@/lib/services/collections'
import { useVault } from '@/lib/context/VaultContext'
import { useTagNameLookup } from '@/lib/hooks/tags/useTagNameLookup'
import { DEFAULT_FIELDS, useLinkForm } from './useLinkForm'
import { COLLECTIONS_NOT_UPDATED, saveLinkCollections } from './saveLinkCollections'

export type MembershipLoadState = 'loading' | 'error' | 'ready'

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
    collectionIds: [] as string[],
    newCollectionNames: [] as string[],
  }
}

type FormState = ReturnType<typeof toFormState>

function tagSet(raw: string): Set<string> {
  return new Set(raw.split(',').map(t => t.trim()).filter(Boolean))
}

// Compares the way handleSubmit saves: text fields trimmed (so '' and null match),
// tags as a set of names (so reordering or a stray comma isn't a change).
function sameIds(a: string[], b: string[]): boolean {
  const setB = new Set(b)
  return a.length === b.length && a.every(id => setB.has(id))
}

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
  const { setCollectionIds } = form

  // The link's current collections, loaded when the form opens. Until they're in
  // (or if the load fails) Save leaves memberships alone.
  const [initialCollectionIds, setInitialCollectionIds] = useState<string[]>([])
  const [membershipState, setMembershipState] = useState<MembershipLoadState>('loading')
  const [membershipAttempt, setMembershipAttempt] = useState(0)
  const savedCollectionIdsRef = useRef<string[] | null>(null)
  const linkId = link?.id ?? null

  useEffect(() => {
    if (!linkId) return
    let cancelled = false
    getCollectionIdsForLink(linkId)
      .then(ids => {
        if (cancelled) return
        setInitialCollectionIds(ids)
        setCollectionIds(ids)
        setMembershipState('ready')
      })
      .catch(() => { if (!cancelled) setMembershipState('error') })
    return () => { cancelled = true }
  // setCollectionIds is a fresh closure each render; the load only depends on the link.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkId, membershipAttempt])

  const retryMemberships = useCallback(() => {
    setMembershipState('loading')
    setMembershipAttempt(n => n + 1)
  }, [])

  const collectionsChanged = membershipState === 'ready' &&
    (!sameIds(form.collectionIds, initialCollectionIds) || form.newCollectionNames.length > 0)
  const hasChanges = differsFrom(form, initial) || collectionsChanged

  async function handleSubmit(): Promise<LinkWithTags | null> {
    if (!link || !dek) return null
    savedCollectionIdsRef.current = null
    const { collectionIds, newCollectionNames } = form
    const before = new Set(initialCollectionIds)
    const after = new Set(collectionIds)
    const add = collectionIds.filter(id => !before.has(id))
    const remove = initialCollectionIds.filter(id => !after.has(id))
    return form.wrapSubmit(
      async () => {
        const updated = await updateLink({
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
        }, dek)
        if (updated && collectionsChanged) {
          const added = await saveLinkCollections(link.id, add, remove, newCollectionNames, dek)
          if (added === null) toast.error(COLLECTIONS_NOT_UPDATED)
          else savedCollectionIdsRef.current = [...collectionIds, ...added.filter(id => !after.has(id))]
        }
        return updated
      },
      'Failed to save changes. Please try again.',
    )
  }

  /** The link's collections after the last successful save, or null when they weren't changed (or failed). */
  const savedCollectionIds = useCallback(() => savedCollectionIdsRef.current, [])

  return { ...form, handleSubmit, hasChanges, membershipState, retryMemberships, savedCollectionIds }
}
