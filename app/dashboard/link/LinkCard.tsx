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
  onOpen?: () => void
  onDelete?: () => void
  isSelectionMode?: boolean
  isSelected?: boolean
  onSelect?: (id: string) => void
  onLongPress?: (id: string) => void
}

export default function LinkCard({
  link, category, onMenuOpen, onFavoriteToggle, onOpen, onDelete,
  isSelectionMode, isSelected, onSelect, onLongPress,
}: Props) {
  const status = STATUS_CONFIG[link.status]
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
    <SwipeableCard onSwipeDelete={isSelectionMode ? undefined : onDelete}>
      <article
        className={`relative flex h-full flex-col bg-white transition dark:bg-slate-900 ${
          isSelectionMode ? 'cursor-pointer select-none' : ''
        } ${isSelected ? 'ring-2 ring-indigo-500 ring-inset rounded-2xl' : ''}`}
        onPointerDown={startLongPress}
        onPointerUp={cancelLongPress}
        onPointerLeave={cancelLongPress}
        onClick={handleCardClick}
      >
        {isSelectionMode && (
          <div className="absolute left-3 top-3 z-20">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-500 text-white'
                  : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800'
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
            <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300 ${isSelectionMode ? 'ml-8' : ''}`}>
              {category
                ? <>{category.emoticon && <span aria-hidden="true">{category.emoticon}</span>}{category.name}</>
                : <span className="text-slate-400 dark:text-slate-500">Uncategorized</span>
              }
            </span>
            {!isSelectionMode && (
              <div className="relative z-10 flex items-center gap-1">
                <button
                  onClick={onFavoriteToggle}
                  aria-label={link.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg text-lg transition ${
                    link.is_favorite
                      ? 'text-amber-400 hover:text-amber-500'
                      : 'text-slate-300 hover:text-amber-400 hover:bg-slate-100 dark:text-slate-600 dark:hover:bg-slate-800'
                  }`}
                >
                  {link.is_favorite ? '⭐' : '☆'}
                </button>
                <button
                  onClick={onMenuOpen}
                  aria-label="Link options"
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-sm text-slate-500 transition hover:bg-slate-200 hover:text-slate-700 active:bg-slate-200 lg:h-10 lg:w-10 lg:text-xl dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                >
                  ···
                </button>
              </div>
            )}
          </div>

          <div>
            <h3 className="line-clamp-2 font-semibold leading-snug text-slate-900 dark:text-slate-50">
              {isSelectionMode ? (
                link.title
              ) : (
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onOpen}
                  className="after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-indigo-500"
                >
                  {link.title}
                </a>
              )}
            </h3>
            <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
              {link.site_name} ↗
              {!link.image_url && link.duration && (
                <span className="ml-2 rounded-full bg-slate-100 px-1.5 py-0.5 font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {link.duration}
                </span>
              )}
            </p>
          </div>

          <p className="line-clamp-2 flex-1 text-sm text-slate-500 dark:text-slate-400">{link.description}</p>

          <div className="relative z-10 flex flex-wrap items-center gap-1.5">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${status.badge}`}>
              {status.label}
            </span>
            {link.tags.map(tagId => (
              <span key={tagId} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                {tagNameById.get(tagId) ?? tagId}
              </span>
            ))}
          </div>
        </div>
      </article>
    </SwipeableCard>
  )
}
