'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { formatCollectionCount } from '@/lib/services/collections'
import type { LinkWithTags } from '@/lib/services/links'
import { useCollectionDetail } from '@/lib/hooks/collections/useCollectionDetail'
import type { MoveDirection } from '@/lib/hooks/collections/useCollectionOrder'
import { useCategoryList } from '@/lib/hooks/categories/useCategoryList'
import { useAvailableTags } from '@/lib/hooks/tags/useAvailableTags'
import { scrollIntoViewIfHidden } from '@/lib/utils/scrollVisibility'
import { ChevronLeftIcon, EllipsisHorizontalIcon, PlayIcon, PlusIcon } from '@/components/icons'
import LoadErrorMessage from '@/components/LoadErrorMessage'
import SearchBar from '@/components/SearchBar'
import SearchNoMatch from '@/components/SearchNoMatch'
import SearchResultCount from '@/components/SearchResultCount'
import SkeletonRows from '@/components/SkeletonRows'
import CollectionPickerSheet from '@/components/CollectionPickerSheet'
import LinkCard from '@/app/dashboard/link/LinkCard'
import BottomSheet from '@/app/dashboard/link/BottomSheet'
import EditLinkModal from '@/app/dashboard/link/EditLinkModal'
import CollectionForm from '../CollectionForm'
import CollectionLinkRowItem from './CollectionLinkRowItem'
import AddLinksToCollectionSheet from './AddLinksToCollectionSheet'
import CollectionOptionsSheet from './CollectionOptionsSheet'

type FocusRequest =
  | { kind: 'row-action'; linkId: string; action: 'up' | 'down' | 'remove'; scroll: boolean }
  | { kind: 'add-links' }
  | { kind: 'scroll'; linkId: string }
  | { kind: 'search' }

const SECONDARY_BUTTON =
  'focus-ring inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-surface-200 bg-surface-card px-3 py-2 text-sm font-medium text-surface-600 shadow-sm transition hover:bg-surface-50 hover:text-surface-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700 dark:hover:text-surface-100'
const PRIMARY_BUTTON =
  'focus-ring inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-60'

function rowElement(linkId: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-collection-row="${CSS.escape(linkId)}"]`)
}

export default function CollectionDetail({ collectionId }: { collectionId: string }) {
  const detail = useCollectionDetail(collectionId)
  const {
    collection, visibleRows, linkCount, doneCount, loading, loadError, notFound, retry,
    order, editForm, deleteFlow, playNextRow, search,
  } = detail
  const { shownRows, isSearching } = search
  const { categories } = useCategoryList()
  const availableTags = useAvailableTags()
  const [addLinksOpen, setAddLinksOpen] = useState(false)
  const [optionsOpen, setOptionsOpen] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  // Set by handlers; a tick re-runs the layout effect that applies it after the new order renders.
  const focusRequestRef = useRef<FocusRequest | null>(null)
  const [focusTick, setFocusTick] = useState(0)
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())
  const addLinksButtonRef = useRef<HTMLButtonElement>(null)
  const optionsButtonRef = useRef<HTMLButtonElement>(null)
  const cancelDeleteRef = useRef<HTMLButtonElement>(null)
  const searchBoxRef = useRef<HTMLDivElement>(null)
  const searchInput = () => searchBoxRef.current?.querySelector<HTMLInputElement>('input') ?? null

  // The name is encrypted, so the server title is generic; swap in the real one.
  useLayoutEffect(() => {
    if (collection) document.title = `${collection.name} — Link Vault`
  }, [collection])

  // The delete confirm takes focus on its safe choice, Cancel.
  const { confirmingDelete } = deleteFlow
  useEffect(() => {
    if (confirmingDelete) cancelDeleteRef.current?.focus()
  }, [confirmingDelete])

  // Focus and scroll after a move / remove / add, once the new order has rendered.
  useLayoutEffect(() => {
    const focusRequest = focusRequestRef.current
    if (!focusRequest) return
    focusRequestRef.current = null
    if (focusRequest.kind === 'add-links') {
      addLinksButtonRef.current?.focus()
    } else if (focusRequest.kind === 'search') {
      searchInput()?.focus()
    } else {
      // A row hidden by the current search isn't rendered: nothing to focus or scroll.
      const row = rowElement(focusRequest.linkId)
      if (row) {
        if (focusRequest.kind === 'row-action') {
          row.querySelector<HTMLElement>(`[data-row-action="${focusRequest.action}"]`)?.focus({ preventScroll: true })
        }
        if (focusRequest.kind === 'scroll' || focusRequest.scroll) scrollIntoViewIfHidden(row)
      }
    }
  }, [focusTick])

  function requestFocus(request: FocusRequest) {
    focusRequestRef.current = request
    setFocusTick(n => n + 1)
  }

  const existingIds = useMemo(() => new Set(detail.rows.map(row => row.link.id)), [detail.rows])

  if (loading) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <BackLink />
        <SkeletonRows count={3} variant="card" label="Loading collection…" header />
      </main>
    )
  }

  if (loadError) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <BackLink />
        <LoadErrorMessage message="Couldn't load this collection." onRetry={retry} className="py-20" />
      </main>
    )
  }

  if (notFound || !collection) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 text-4xl" aria-hidden="true">📚</div>
          <h1 className="text-lg font-semibold text-surface-900 dark:text-surface-50">Collection not found</h1>
          <Link href="/dashboard/organize/collections" className="focus-ring mt-3 inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400">
            Back to Collections
          </Link>
        </div>
      </main>
    )
  }

  function handleMove(linkId: string, direction: MoveDirection) {
    const result = order.move(linkId, direction)
    if (!result) return
    const lastIndex = visibleRows.length - 1
    // Stay on the same arrow, unless the row just reached the edge that disables it.
    const reachedEdge = (direction === 'up' && result.index === 0) || (direction === 'down' && result.index === lastIndex)
    const action = reachedEdge ? (direction === 'up' ? 'down' : 'up') : direction
    requestFocus({ kind: 'row-action', linkId, action, scroll: true })
    setAnnouncement(`Moved to position ${result.index + 1}`)
    result.saved.then(ok => {
      // A rollback moves the row back; keep focus on the arrow that was pressed.
      if (!ok) requestFocus({ kind: 'row-action', linkId, action: direction, scroll: true })
    })
  }

  // Focus moves to the next shown row's ✕, else the previous one's; with no shown
  // row left, to the search box while the collection still has links, else `+ Add links`.
  function handleRemove(linkId: string) {
    const index = shownRows.findIndex(row => row.link.id === linkId)
    const next = shownRows[index + 1] ?? shownRows[index - 1]
    order.remove(linkId)
    if (next) requestFocus({ kind: 'row-action', linkId: next.link.id, action: 'remove', scroll: false })
    else if (visibleRows.length > 1) requestFocus({ kind: 'search' })
    else requestFocus({ kind: 'add-links' })
  }

  function clearSearchAndFocus() {
    search.clearSearch()
    searchInput()?.focus()
  }

  function handlePlayNext() {
    const id = detail.playNext()
    if (id) requestFocus({ kind: 'scroll', linkId: id })
  }

  function cancelDelete() {
    deleteFlow.cancelDelete()
    optionsButtonRef.current?.focus()
  }

  function handleAdded(links: LinkWithTags[]) {
    if (links[0]) requestFocus({ kind: 'scroll', linkId: links[0].id })
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <BackLink />

      {editForm.editing ? (
        <CollectionForm
          title="Edit collection"
          name={editForm.editName} onNameChange={editForm.setEditName}
          emoji={editForm.editEmoji} onEmojiChange={editForm.setEditEmoji}
          description={editForm.editDescription} onDescriptionChange={editForm.setEditDescription}
          error={editForm.editError} saving={editForm.saving}
          submitLabel="Save"
          onSubmit={editForm.handleSaveEdit} onCancel={editForm.cancelEdit}
        />
      ) : (
        <header className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-surface-900 dark:text-surface-50">
            {collection.emoji && <span aria-hidden="true">{collection.emoji}</span>}
            <span className="min-w-0 break-words">{collection.name}</span>
          </h1>
          {collection.description && (
            <p className="mt-1 text-sm text-surface-600 dark:text-surface-300">{collection.description}</p>
          )}
          <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">{formatCollectionCount(linkCount, doneCount)}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={handlePlayNext} disabled={!playNextRow} className={PRIMARY_BUTTON}>
              <PlayIcon className="h-4 w-4" />
              {playNextRow ? 'Play next' : 'All done'}
            </button>
            <button
              type="button"
              ref={addLinksButtonRef}
              onClick={() => setAddLinksOpen(true)}
              aria-haspopup="dialog"
              aria-label="+ Add links"
              className={SECONDARY_BUTTON}
            >
              <PlusIcon className="h-4 w-4" />
              Add links
            </button>
            <button
              type="button"
              ref={optionsButtonRef}
              onClick={() => setOptionsOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={optionsOpen}
              aria-label="Collection options"
              title="Collection options"
              className={`${SECONDARY_BUTTON} ml-auto w-11 justify-center px-0`}
            >
              <EllipsisHorizontalIcon className="h-5 w-5" />
            </button>
          </div>

          {deleteFlow.confirmingDelete && (
            <div
              role="group"
              aria-label="Delete collection"
              onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); cancelDelete() } }}
              className="mt-4 rounded-2xl bg-red-50 p-4 dark:bg-red-950/40"
            >
              <p className="text-sm text-red-700 dark:text-red-300">
                Delete &ldquo;{collection.name}&rdquo;? Its {linkCount} {linkCount === 1 ? 'link stays' : 'links stay'} saved.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={deleteFlow.handleDelete}
                  disabled={deleteFlow.deleting}
                  className="focus-ring min-h-11 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deleteFlow.deleting ? 'Deleting…' : 'Delete'}
                </button>
                <button type="button" ref={cancelDeleteRef} onClick={cancelDelete} className={SECONDARY_BUTTON}>Cancel</button>
              </div>
            </div>
          )}
        </header>
      )}

      <p aria-live="polite" className="sr-only">{announcement}</p>

      {visibleRows.length > 0 && (
        <div ref={searchBoxRef}>
          <SearchBar
            value={search.query}
            onChange={search.setQuery}
            isHashTagSearch={search.isHashTagSearch}
            availableTags={availableTags}
            label="Search this collection"
          />
          <SearchResultCount shown={shownRows.length} total={linkCount} noun="link" active={isSearching} />
        </div>
      )}

      {visibleRows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 text-4xl" aria-hidden="true">📭</div>
          <p className="text-surface-500 dark:text-surface-400">No links in this collection yet.</p>
          <button
            type="button"
            onClick={() => setAddLinksOpen(true)}
            aria-haspopup="dialog"
            className={`${PRIMARY_BUTTON} mt-4`}
          >
            <PlusIcon className="h-4 w-4" />
            Add links
          </button>
        </div>
      ) : shownRows.length === 0 ? (
        <SearchNoMatch message={`No links match "${search.query.trim()}".`} onClear={clearSearchAndFocus} />
      ) : (
        <ol className="space-y-4">
          {shownRows.map(({ link, number }) => (
            <CollectionLinkRowItem
              key={link.id}
              linkId={link.id}
              number={number}
              isFirst={number === 1}
              isLast={number === visibleRows.length}
              isSwapping={order.isSwapping}
              showMoveButtons={!isSearching}
              onMove={direction => handleMove(link.id, direction)}
              onRemove={() => handleRemove(link.id)}
            >
              <LinkCard
                link={link}
                category={categories.find(c => c.id === link.category_id) ?? null}
                onMenuOpen={() => detail.setActiveLinkId(link.id)}
                isMenuOpen={detail.activeLink?.id === link.id}
                onFavoriteToggle={() => detail.handleFavoriteToggle(link.id)}
                onEdit={() => detail.setEditingLink(link)}
                onOpen={() => detail.handleLinkOpen(link.id, link.status)}
                isLastOpened={link.id === detail.lastOpenedId}
                imageState={failedImages.has(link.id) ? 'failed' : undefined}
                onImageError={() => setFailedImages(prev => new Set(prev).add(link.id))}
                onDelete={() => detail.handleDelete(link.id)}
              />
            </CollectionLinkRowItem>
          ))}
        </ol>
      )}

      <AddLinksToCollectionSheet
        isOpen={addLinksOpen}
        collectionName={collection.name}
        existingIds={existingIds}
        onAdd={detail.appendLinks}
        onAdded={handleAdded}
        onClose={() => setAddLinksOpen(false)}
      />

      <CollectionOptionsSheet
        isOpen={optionsOpen}
        collectionName={collection.name}
        onEdit={editForm.startEdit}
        onDelete={deleteFlow.askDelete}
        onClose={() => setOptionsOpen(false)}
        returnFocus={() => optionsButtonRef.current}
      />

      <EditLinkModal
        key={detail.editingLink?.id}
        link={detail.editingLink}
        onSave={detail.handleEdit}
        onClose={() => detail.setEditingLink(null)}
        fallbackFocus={searchInput}
      />

      <BottomSheet
        link={detail.activeLink}
        onStatusChange={detail.handleStatusChange}
        onClose={() => detail.setActiveLinkId(null)}
        onAddToCollection={link => { detail.setActiveLinkId(null); detail.setPickerLink(link) }}
      />

      <CollectionPickerSheet
        link={detail.pickerLink}
        onClose={() => detail.setPickerLink(null)}
        onMembershipChange={detail.handleMembershipChange}
        returnFocus={() => {
          const id = detail.pickerLink?.id
          return id ? rowElement(id)?.querySelector<HTMLElement>('button[aria-label="Link options"]') ?? addLinksButtonRef.current : null
        }}
      />
    </main>
  )
}

function BackLink() {
  return (
    <Link
      href="/dashboard/organize/collections"
      className="focus-ring -ml-2 mb-4 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-medium text-surface-500 hover:text-surface-800 dark:text-surface-400 dark:hover:text-surface-100"
    >
      <ChevronLeftIcon className="h-4 w-4" /> Collections
    </Link>
  )
}
