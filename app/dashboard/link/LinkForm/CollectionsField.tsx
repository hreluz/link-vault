'use client'

import { useId, useRef } from 'react'
import { COLLECTION_NAME_MAX } from '@/lib/services/collections'
import { useVault } from '@/lib/context/VaultContext'
import { useCollectionsField } from '@/lib/hooks/collections/useCollectionsField'
import { useLinkFormContext } from '../LinkFormContext'
import { LABEL } from './styles'

/** Inline chip combobox for the link's collections. Always visible, right after Title. */
export default function CollectionsField() {
  const {
    collectionIds, setCollectionIds, newCollectionNames, setNewCollectionNames,
    membershipState = 'ready', retryMemberships,
  } = useLinkFormContext()
  const { dek } = useVault()
  const field = useCollectionsField({
    selectedIds: collectionIds,
    setSelectedIds: setCollectionIds,
    pendingNames: newCollectionNames,
    setPendingNames: setNewCollectionNames,
    dek,
  })
  const inputRef = useRef<HTMLInputElement>(null)
  const id = useId()
  const listId = `${id}-list`
  const optionId = (index: number) => `${id}-opt-${index}`

  const loading = field.loading || membershipState === 'loading'
  const loadError = field.loadError || membershipState === 'error'
  const disabled = loading || loadError

  function retry() {
    if (field.loadError) field.retry()
    if (membershipState === 'error') retryMemberships?.()
  }

  return (
    <div>
      <label htmlFor={id} className={LABEL}>Collections</label>
      <div className="relative">
        <div
          className={`flex flex-wrap items-center gap-x-1.5 gap-y-1 w-full rounded-xl border border-surface-200 bg-surface-card px-4 py-3 text-sm transition focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/20 dark:border-surface-700 dark:bg-surface-800 ${
            disabled ? 'cursor-not-allowed opacity-50' : 'cursor-text'
          }`}
          onClick={() => inputRef.current?.focus()}
        >
          {field.chips.map(chip => (
            <span
              key={chip.kind === 'saved' ? chip.id : `pending:${chip.name}`}
              className="inline-flex max-w-full items-center gap-1 rounded-full bg-primary-100 py-0.5 pl-2.5 pr-1.5 text-xs font-medium text-primary-700 dark:bg-primary-900/40 dark:text-primary-300"
            >
              {chip.kind === 'saved' && chip.emoji && <span aria-hidden="true">{chip.emoji}</span>}
              <span className="truncate">{chip.name}</span>
              {chip.kind === 'pending' && (
                <span className="rounded-full bg-primary-600 px-1.5 text-[10px] font-semibold uppercase leading-4 text-white">new</span>
              )}
              <button
                type="button"
                onClick={e => { e.stopPropagation(); field.removeChip(chip); inputRef.current?.focus() }}
                disabled={disabled}
                aria-label={`Remove from ${chip.name}`}
                className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-primary-700/70 transition hover:bg-primary-200 hover:text-primary-700 disabled:cursor-not-allowed dark:text-primary-300/70 dark:hover:bg-primary-800 dark:hover:text-primary-200"
              >
                <span aria-hidden="true" className="text-[10px]">✕</span>
              </button>
            </span>
          ))}
          <input
            id={id}
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={field.listOpen}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={field.listOpen && field.highlight >= 0 ? optionId(field.highlight) : undefined}
            value={field.query}
            maxLength={COLLECTION_NAME_MAX}
            disabled={disabled}
            placeholder="Add to a collection…"
            onChange={e => field.setQuery(e.target.value)}
            onKeyDown={field.onKeyDown}
            onBlur={field.closeList}
            className="flex-1 min-w-32 outline-none bg-transparent text-surface-900 placeholder-surface-400 disabled:cursor-not-allowed dark:text-surface-100 dark:placeholder-surface-500"
          />
        </div>
        <ul
          id={listId}
          role="listbox"
          aria-label="Collection suggestions"
          hidden={!field.listOpen}
          className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-surface-200 bg-surface-card shadow-lg dark:border-surface-700 dark:bg-surface-900"
        >
          {field.listOpen && field.options.map((option, index) => (
            <li
              key={option.kind === 'collection' ? option.collection.id : 'create'}
              id={optionId(index)}
              role="option"
              aria-selected={index === field.highlight}
              onMouseDown={e => { e.preventDefault(); field.pick(option) }}
              onMouseEnter={() => field.setHighlight(index)}
              className={`flex min-h-11 cursor-pointer items-center gap-2 px-4 py-2 text-sm transition-colors sm:min-h-9 ${
                index === field.highlight
                  ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                  : option.kind === 'create'
                  ? 'font-medium text-primary-600 hover:bg-surface-50 dark:text-primary-400 dark:hover:bg-surface-800'
                  : 'text-surface-700 hover:bg-surface-50 dark:text-surface-300 dark:hover:bg-surface-800'
              }`}
            >
              {option.kind === 'collection' ? (
                <>
                  <span aria-hidden="true" className="w-5 shrink-0 text-center">{option.collection.emoji ?? ''}</span>
                  <span className="truncate">{option.collection.name}</span>
                </>
              ) : (
                <span className="truncate">+ Create &ldquo;{option.name}&rdquo;</span>
              )}
            </li>
          ))}
        </ul>
      </div>
      {loading && !loadError && (
        <p role="status" className="mt-1.5 text-xs text-surface-500 dark:text-surface-400">Loading collections…</p>
      )}
      {loadError && (
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <p role="alert" className="text-xs text-red-600 dark:text-red-400">Couldn&apos;t load your collections.</p>
          <button
            type="button"
            onClick={retry}
            className="focus-ring -my-3 inline-flex min-h-11 items-center rounded-lg px-1 text-xs font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  )
}
