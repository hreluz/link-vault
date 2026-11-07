'use client'

import { useState } from 'react'
import SwipeableCard from '@/components/SwipeableCard'
import type { TrashedLink } from '@/lib/services/trash'
import type { Category } from '@/lib/services/categories'
import { useTagNameLookup } from '@/lib/hooks/tags/useTagNameLookup'
import { displayTitle } from '@/lib/utils/urlTitle'
import { NoSymbolIcon, TrashSolidIcon } from '@/components/icons'

interface Props {
  link: TrashedLink
  category?: Category | null
  onRestore: () => void
  onDeletePermanently: () => void
}

export default function TrashCard({ link, category, onRestore, onDeletePermanently }: Props) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const tagNameById = useTagNameLookup()

  const deletedDate = link.deleted_at
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(link.deleted_at))
    : null

  return (
    <SwipeableCard onSwipeDelete={onDeletePermanently}>
      <article className="relative flex h-full flex-col bg-surface-card dark:bg-surface-900">
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
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-surface-100 px-2.5 py-1 text-xs font-medium text-surface-700 dark:bg-surface-800 dark:text-surface-300">
              {category
                ? <>{category.emoticon && <span aria-hidden="true">{category.emoticon}</span>}{category.name}</>
                : <span className="text-surface-400 dark:text-surface-500">Uncategorized</span>
              }
            </span>

            <div className="flex shrink-0 items-center gap-1.5">
              {confirmingDelete ? (
                <>
                  <button
                    onClick={() => setConfirmingDelete(false)}
                    aria-label="Cancel delete"
                    className="rounded-xl border border-surface-200 bg-surface-card px-3 py-1.5 text-xs font-medium text-surface-500 transition hover:bg-surface-50 dark:bg-surface-800 dark:border-surface-600 dark:text-surface-400 dark:hover:bg-surface-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={onDeletePermanently}
                    aria-label="Confirm permanent delete"
                    className="flex items-center gap-1.5 rounded-xl bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-500 dark:bg-red-700 dark:hover:bg-red-600"
                  >
                    <TrashSolidIcon className="size-3.5" />
                    Delete
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setConfirmingDelete(true)}
                    aria-label="Delete link permanently"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-surface-400 transition hover:bg-red-50 hover:text-red-500 dark:text-surface-500 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                  >
                    <TrashSolidIcon className="size-4" />
                  </button>
                  <button
                    onClick={onRestore}
                    aria-label="Restore link"
                    className="flex items-center gap-1.5 rounded-xl border border-surface-200 bg-surface-card px-3 py-1.5 text-xs font-semibold text-primary-600 shadow-sm transition hover:bg-primary-50 hover:border-primary-300 dark:bg-surface-800 dark:border-surface-600 dark:text-primary-400 dark:hover:bg-primary-900/30 dark:hover:border-primary-700"
                  >
                    <NoSymbolIcon className="size-3.5" />
                    Restore
                  </button>
                </>
              )}
            </div>
          </div>

          <div>
            <h3 className="line-clamp-2 font-semibold leading-snug text-surface-900 dark:text-surface-50">
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary-600 focus-visible:outline-none focus-visible:text-primary-600"
              >
                {displayTitle(link)}
              </a>
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

          <div className="flex flex-wrap items-center gap-1.5">
            {link.tags.map(tagId => (
              <span key={tagId} className="rounded-full bg-surface-100 px-2.5 py-0.5 text-xs text-surface-500 dark:bg-surface-800 dark:text-surface-400">
                {tagNameById.get(tagId) ?? tagId}
              </span>
            ))}
            {deletedDate && (
              <span className="ml-auto text-xs text-surface-400 dark:text-surface-500">
                Deleted {deletedDate}
              </span>
            )}
          </div>
        </div>
      </article>
    </SwipeableCard>
  )
}
