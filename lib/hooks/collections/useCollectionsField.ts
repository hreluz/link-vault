'use client'

import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from 'react'
import { getCollections, type Collection } from '@/lib/services/collections'
import { filterCollectionsByName, findCollectionByName } from '@/lib/utils/collectionSearch'

export const FIELD_MATCH_LIMIT = 8

export type CollectionOption =
  | { kind: 'collection'; collection: Collection }
  | { kind: 'create'; name: string }

/** A chip in the field: a saved collection, or a pending name created on Save. */
export type CollectionChip =
  | { kind: 'saved'; id: string; name: string; emoji: string | null }
  | { kind: 'pending'; name: string }

type Params = {
  selectedIds: string[]
  setSelectedIds: (ids: string[]) => void
  pendingNames: string[]
  setPendingNames: (names: string[]) => void
  dek: CryptoKey | null
}

/**
 * The link form's Collections chip combobox: nothing is suggested until the user
 * types; up to 8 unselected name matches, then `+ Create "<query>"` when no
 * collection (selected or not) or pending name has that exact name. Picking keeps
 * focus; Enter never submits the form.
 */
export function useCollectionsField({ selectedIds, setSelectedIds, pendingNames, setPendingNames, dek }: Params) {
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [query, setQueryState] = useState('')
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(-1)

  useEffect(() => {
    if (!dek) return
    let cancelled = false
    getCollections(dek)
      .then(list => {
        if (cancelled) return
        setCollections(list)
        setLoadError(false)
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setLoadError(true)
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [dek, attempt])

  const retry = useCallback(() => {
    setLoading(true)
    setLoadError(false)
    setAttempt(n => n + 1)
  }, [])

  const trimmed = query.trim()
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])
  const unselected = useMemo(() => collections.filter(c => !selectedSet.has(c.id)), [collections, selectedSet])

  const options: CollectionOption[] = useMemo(() => {
    if (!trimmed) return []
    const matches: CollectionOption[] = filterCollectionsByName(unselected, trimmed)
      .slice(0, FIELD_MATCH_LIMIT)
      .map(collection => ({ kind: 'collection', collection }))
    const lower = trimmed.toLowerCase()
    const exists = !!findCollectionByName(collections, trimmed) || pendingNames.some(name => name.toLowerCase() === lower)
    return exists ? matches : [...matches, { kind: 'create', name: trimmed }]
  }, [trimmed, unselected, collections, pendingNames])

  const listOpen = open && options.length > 0

  const chips: CollectionChip[] = useMemo(() => {
    const byId = new Map(collections.map(c => [c.id, c]))
    const saved = selectedIds.flatMap(id => {
      const c = byId.get(id)
      return c ? [{ kind: 'saved' as const, id, name: c.name, emoji: c.emoji }] : []
    })
    return [...saved, ...pendingNames.map(name => ({ kind: 'pending' as const, name }))]
  }, [collections, selectedIds, pendingNames])

  function setQuery(value: string) {
    setQueryState(value)
    setOpen(true)
    setHighlight(-1)
  }

  function pick(option: CollectionOption) {
    if (option.kind === 'collection') setSelectedIds([...selectedIds, option.collection.id])
    else setPendingNames([...pendingNames, option.name])
    setQueryState('')
    setHighlight(-1)
  }

  function removeChip(chip: CollectionChip) {
    if (chip.kind === 'saved') setSelectedIds(selectedIds.filter(id => id !== chip.id))
    else setPendingNames(pendingNames.filter(name => name !== chip.name))
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!listOpen) {
        if (options.length > 0) { e.preventDefault(); setOpen(true) }
        return
      }
      e.preventDefault()
      const step = e.key === 'ArrowDown' ? 1 : -1
      setHighlight(h => {
        const next = h + step
        if (next < -1) return options.length - 1
        if (next >= options.length) return -1
        return next
      })
      return
    }
    if (e.key === 'Enter') {
      // Never submits the form and never blurs.
      e.preventDefault()
      if (listOpen && highlight >= 0 && options[highlight]) { pick(options[highlight]); return }
      if (!trimmed) return
      const exact = findCollectionByName(unselected, trimmed)
      if (exact) { pick({ kind: 'collection', collection: exact }); return }
      const create = options.find(option => option.kind === 'create')
      if (create) pick(create)
      return
    }
    if (e.key === 'Escape') {
      // With the list open, Escape only closes it; defaultPrevented tells useDialog to leave the modal open.
      if (listOpen) {
        e.preventDefault()
        e.stopPropagation()
        setOpen(false)
        setHighlight(-1)
      }
      return
    }
    if (e.key === 'Backspace' && query === '' && chips.length > 0) {
      e.preventDefault()
      removeChip(chips[chips.length - 1])
    }
  }

  return {
    loading, loadError, retry,
    query, setQuery, options, listOpen, highlight, setHighlight, closeList: () => { setOpen(false); setHighlight(-1) },
    chips, pick, removeChip, onKeyDown,
  }
}
