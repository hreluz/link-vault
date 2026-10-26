'use client'

import { useRef } from 'react'
import SwipeableCard from '@/components/SwipeableCard'
import type { LinkWithTags } from '@/lib/services/links'
import type { Category } from '@/lib/services/categories'
import { useTagNameLookup } from '@/lib/hooks/tags/useTagNameLookup'
import { STATUS_CONFIG } from '../config'

interface Props {
  link: LinkWithTags
  category?: Category | null
  onMenuOpen: () => void
  onFavoriteToggle: () => void
  onEdit?: () => void
  onOpen?: () => void
  onDelete?: () => void
  isSelectionMode?: boolean
  isSelected?: boolean
  onSelect?: (id: string) => void
  onLongPress?: (id: string) => void
  isLastOpened?: boolean
  pulse?: boolean
}

export default function LinkCard({
  link, category, onMenuOpen, onFavoriteToggle, onEdit, onOpen, onDelete,
  isSelectionMode, isSelected, onSelect, onLongPress, isLastOpened, pulse,
}: Props) {
  const status = STATUS_CONFIG[link.status]
  const showLastOpened = isLastOpened && !isSelectionMode
  const tagNameById = useTagNameLookup()
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function startLongPress() {
    if (!onLongPress) return
    longPressTimer.current = setTimeout(() => {
      onLongPress(link.id)
    }, 500)
  }

  function cancelLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  function handleCardClick(e: React.MouseEvent) {
    if (!isSelectionMode) return
    e.preventDefault()
    onSelect?.(link.id)
  }

  return (
    <SwipeableCard onSwipeDelete={isSelectionMode || link.is_favorite ? undefined : onDelete}>
      <article
        className={`relative flex h-full flex-col bg-surface-card transition dark:bg-surface-900 ${
          isSelectionMode ? 'cursor-pointer select-none' : ''
        } ${isSelected ? 'ring-2 ring-primary-500 ring-inset rounded-2xl' : ''} ${
          showLastOpened ? 'ring-2 ring-primary-500/60 ring-inset rounded-2xl' : ''
        }`}
        onPointerDown={startLongPress}
        onPointerUp={cancelLongPress}
        onPointerLeave={cancelLongPress}
        onClick={handleCardClick}
      >
        {/* Pulse a ring overlay, not the card: fading the card's opacity would
            reveal SwipeableCard's delete backdrop underneath. */}
        {showLastOpened && pulse && (
          <span
            aria-hidden="true"
            data-testid="last-opened-pulse"
            className="pointer-events-none absolute inset-0 z-10 rounded-2xl ring-2 ring-inset ring-primary-500 motion-safe:animate-pulse"
          />
        )}
        {isSelectionMode && (
          <div className="absolute left-3 top-3 z-20">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition ${
                isSelected
                  ? 'border-primary-500 bg-primary-500 text-white'
                  : 'border-surface-300 bg-surface-card dark:border-surface-600 dark:bg-surface-800'
              }`}
            >
              {isSelected && (
                <svg className="h-3.5 w-3.5" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          </div>
        )}

        {link.image_url && (
          <div className="overflow-hidden rounded-t-2xl">
            <div className="relative">
              <img
                src={link.image_url}
                alt=""
                className="w-full object-cover"
                style={{ aspectRatio: '16/9' }}
                loading="lazy"
              />
              {link.duration && (
                <span className="absolute bottom-2 right-2 rounded-md bg-black/80 px-1.5 py-0.5 text-xs font-semibold text-white">
                  {link.duration}
                </span>
              )}
            </div>
          </div>
        )}

        <div className="relative flex flex-1 flex-col gap-3 p-5">
          <div className="flex items-start justify-between gap-2">
            <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full bg-surface-100 px-2.5 py-1 text-xs font-medium text-surface-700 dark:bg-surface-800 dark:text-surface-300 ${isSelectionMode ? 'ml-8' : ''}`}>
              {category
                ? <>{category.emoticon && <span aria-hidden="true">{category.emoticon}</span>}{category.name}</>
                : <span className="text-surface-400 dark:text-surface-500">Uncategorized</span>
              }
            </span>
            {!isSelectionMode && (
              <div className="relative z-10 flex items-center gap-1">
                {onDelete && (
                  <button
                    onClick={onDelete}
                    disabled={link.is_favorite}
                    aria-label="Delete link"
                    title={link.is_favorite ? 'Unfavorite to delete' : 'Delete'}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-surface-400 transition disabled:cursor-not-allowed disabled:opacity-40 lg:h-10 lg:w-10 dark:text-surface-500 ${
                      link.is_favorite
                        ? ''
                        : 'hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400'
                    }`}
                  >
                    <svg aria-hidden="true" className="h-4 w-4 lg:h-5 lg:w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3.5 5.5h13M8 5.5V4a1 1 0 011-1h2a1 1 0 011 1v1.5M5 5.5l.8 10.6a1 1 0 001 .9h6.4a1 1 0 001-.9L15 5.5M8.5 9v5M11.5 9v5" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={onFavoriteToggle}
                  aria-label={link.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                  title={link.is_favorite ? 'Favorite (delete-protected) — click to remove' : 'Favorite — also protects from deletion'}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg text-lg transition ${
                    link.is_favorite
                      ? 'text-amber-400 hover:text-amber-500'
                      : 'text-surface-300 hover:text-amber-400 hover:bg-surface-100 dark:text-surface-600 dark:hover:bg-surface-800'
                  }`}
                >
                  {link.is_favorite ? '⭐' : '☆'}
                </button>
                {onEdit && (
                  <button
                    onClick={onEdit}
                    aria-label="Edit link"
                    data-link-edit={link.id}
                    title="Edit"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-surface-400 transition hover:bg-surface-100 hover:text-surface-700 active:bg-surface-200 lg:h-10 lg:w-10 dark:text-surface-500 dark:hover:bg-surface-800 dark:hover:text-surface-200"
                  >
                    <svg aria-hidden="true" className="h-4 w-4 lg:h-5 lg:w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M13.5 3.5l3 3L7 16H4v-3l9.5-9.5z" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={onMenuOpen}
                  aria-label="Link options"
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-100 text-sm text-surface-500 transition hover:bg-surface-200 hover:text-surface-700 active:bg-surface-200 lg:h-10 lg:w-10 lg:text-xl dark:bg-surface-800 dark:text-surface-400 dark:hover:bg-surface-700 dark:hover:text-surface-200"
                >
                  ···
                </button>
              </div>
            )}
          </div>

          <div>
            <h3 className="line-clamp-2 font-semibold leading-snug text-surface-900 dark:text-surface-50">
              {isSelectionMode ? (
                link.title
              ) : (
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onOpen}
                  aria-current={showLastOpened ? 'true' : undefined}
                  className="after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-primary-500"
                >
                  {link.title}
                </a>
              )}
            </h3>
            <p className="mt-0.5 text-xs text-surface-400 dark:text-surface-500">
              {link.site_name} ↗
              {!link.image_url && link.duration && (
                <span className="ml-2 rounded-full bg-surface-100 px-1.5 py-0.5 font-medium text-surface-500 dark:bg-surface-800 dark:text-surface-400">
                  {link.duration}
                </span>
              )}
            </p>
          </div>

          <p className="line-clamp-2 flex-1 text-sm text-surface-500 dark:text-surface-400">{link.description}</p>

          <div className="relative z-10 flex flex-wrap items-center gap-1.5">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${status.badge}`}>
              {status.label}
            </span>
            {showLastOpened && (
              <span className="inline-flex items-center rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                Last opened
              </span>
            )}
            {link.tags.map(tagId => (
              <span key={tagId} className="rounded-full bg-surface-100 px-2.5 py-0.5 text-xs text-surface-500 dark:bg-surface-800 dark:text-surface-400">
                {tagNameById.get(tagId) ?? tagId}
              </span>
            ))}
          </div>
        </div>
      </article>
    </SwipeableCard>
  )
}
