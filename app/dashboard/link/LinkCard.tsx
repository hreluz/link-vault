'use client'

import SwipeableCard from '@/components/SwipeableCard'
import type { LinkWithTags } from '@/lib/services/links'
import type { Category } from '@/lib/services/categories'
import type { CardImageState } from '@/lib/hooks/links/list/useCardImageRefresh'
import { useTagNameLookup } from '@/lib/hooks/tags/useTagNameLookup'
import { displayTitle } from '@/lib/utils/urlTitle'
import { STATUS_CONFIG } from '../config'
import { PencilIcon, SendToEndIcon, StarIcon, TrashIcon } from '@/components/icons'

interface Props {
  link: LinkWithTags
  category?: Category | null
  onMenuOpen: () => void
  /** True while this card's ··· BottomSheet is open (drives aria-expanded). */
  isMenuOpen?: boolean
  onFavoriteToggle: () => void
  onEdit?: () => void
  onOpen?: () => void
  onDelete?: () => void
  onSendToEnd?: () => void
  isLastOpened?: boolean
  pulse?: boolean
  /** 'refreshing' shows a placeholder while a broken image is refetched; 'failed' drops the image. */
  imageState?: CardImageState
  onImageError?: () => void
}

// Action buttons sit above the stretched title link (z-10) one by one, so the
// gaps between them still open the link. 44px below lg, 40px at lg (SPEC 34).
const ACTION_BASE =
  'focus-ring relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition lg:h-10 lg:w-10'
const ACTION_ICON =
  `${ACTION_BASE} text-surface-500 hover:bg-surface-100 hover:text-surface-700 active:bg-surface-200 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-surface-200`
const ICON_SVG = 'h-5 w-5'

export default function LinkCard({
  link, category, onMenuOpen, isMenuOpen = false, onFavoriteToggle, onEdit, onOpen, onDelete, onSendToEnd,
  isLastOpened, pulse, imageState, onImageError,
}: Props) {
  const status = STATUS_CONFIG[link.status]
  const showImage = !!link.image_url && imageState !== 'failed'
  const tagNameById = useTagNameLookup()

  return (
    // Favorites can be swiped open too; their Delete shows the "Unfavorite to
    // delete" toast from handleDelete instead of deleting (SPEC 35).
    <SwipeableCard onSwipeDelete={onDelete}>
      <article
        data-link-id={link.id}
        className={`relative flex h-full scroll-mt-20 sm:scroll-mt-32 flex-col bg-surface-card transition dark:bg-surface-900 ${
          isLastOpened ? 'ring-2 ring-primary-500/60 ring-inset rounded-2xl' : ''
        }`}
      >
        {/* Pulse a ring overlay, not the card: fading the card's opacity would
            reveal SwipeableCard's delete backdrop underneath. Used for the
            last-opened tab-return pulse and the restored-after-undo pulse (SPEC 36). */}
        {pulse && (
          <span
            aria-hidden="true"
            data-testid="last-opened-pulse"
            className="pointer-events-none absolute inset-0 z-10 rounded-2xl ring-2 ring-inset ring-primary-500 motion-safe:animate-pulse"
          />
        )}
        {showImage && (
          <div className="overflow-hidden rounded-t-2xl">
            <div className="relative">
              {imageState === 'refreshing' ? (
                <div
                  data-testid="card-image-refreshing"
                  className="w-full animate-pulse bg-surface-100 motion-reduce:animate-none dark:bg-surface-800"
                  style={{ aspectRatio: '16/9' }}
                />
              ) : (
                <img
                  src={link.image_url!}
                  alt=""
                  className="w-full object-cover"
                  style={{ aspectRatio: '16/9' }}
                  loading="lazy"
                  onError={onImageError}
                />
              )}
              {link.duration && (
                <span className="absolute bottom-2 right-2 rounded-md bg-black/80 px-1.5 py-0.5 text-xs font-semibold text-white">
                  {link.duration}
                </span>
              )}
            </div>
          </div>
        )}

        <div className="relative flex flex-1 flex-col gap-3 p-5 pb-3">
          <div className="flex min-w-0">
            <span className={`inline-flex min-w-0 items-center gap-1.5 rounded-full bg-surface-100 px-2.5 py-1 text-xs font-medium text-surface-700 dark:bg-surface-800 dark:text-surface-300`}>
              {category
                ? <>{category.emoticon && <span aria-hidden="true" className="shrink-0">{category.emoticon}</span>}<span className="truncate">{category.name}</span></>
                : <span className="truncate text-surface-500 dark:text-surface-400">Uncategorized</span>
              }
            </span>
          </div>

          <div>
            <h3 className="line-clamp-2 font-semibold leading-snug text-surface-900 dark:text-surface-50">
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onOpen}
                data-card-title=""
                aria-current={isLastOpened ? 'true' : undefined}
                className="after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-primary-500"
              >
                {displayTitle(link)}
              </a>
            </h3>
            <p className="mt-0.5 text-xs text-surface-500 dark:text-surface-400">
              {link.site_name} ↗
              {!showImage && link.duration && (
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
            {isLastOpened && (
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

          <div
            data-testid="card-actions"
            className="flex items-center gap-2 border-t border-surface-200 pt-3 dark:border-surface-700"
          >
            {onDelete && (
              // aria-disabled, not disabled, on a favorite: the tap still reaches
              // onDelete, whose handleDelete shows the "Unfavorite to delete" toast
              // (the same message as the swipe path) and deletes nothing (SPEC 38).
              <button
                onClick={onDelete}
                aria-disabled={link.is_favorite || undefined}
                aria-label="Delete link"
                title={link.is_favorite ? 'Unfavorite to delete' : 'Delete'}
                className={`${ACTION_BASE} text-surface-500 dark:text-surface-400 ${
                  link.is_favorite
                    ? 'cursor-not-allowed opacity-40'
                    : 'hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400'
                }`}
              >
                <TrashIcon className={ICON_SVG} />
              </button>
            )}
            <button
              onClick={onFavoriteToggle}
              aria-label={link.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
              title={link.is_favorite ? 'Favorite (delete-protected) — click to remove' : 'Favorite — also protects from deletion'}
              className={`${ACTION_BASE} ${
                link.is_favorite
                  ? 'text-amber-400 hover:text-amber-500'
                  : 'text-surface-500 hover:text-amber-400 hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-800'
              }`}
            >
              <StarIcon filled={link.is_favorite} className={ICON_SVG} />
            </button>
            {onEdit && (
              <button
                onClick={onEdit}
                aria-label="Edit link"
                data-link-edit={link.id}
                title="Edit"
                className={ACTION_ICON}
              >
                <PencilIcon className={ICON_SVG} />
              </button>
            )}
            {onSendToEnd && (
              <button
                onClick={onSendToEnd}
                aria-label="Send to end"
                title="Send to end"
                className={ACTION_ICON}
              >
                <SendToEndIcon className={ICON_SVG} />
              </button>
            )}
            <button
              onClick={onMenuOpen}
              aria-label="Link options"
              aria-haspopup="dialog"
              aria-expanded={isMenuOpen}
              className={`${ACTION_BASE} ml-auto bg-surface-100 text-xl text-surface-500 hover:bg-surface-200 hover:text-surface-700 active:bg-surface-200 dark:bg-surface-800 dark:text-surface-400 dark:hover:bg-surface-700 dark:hover:text-surface-200`}
            >
              ···
            </button>
          </div>
        </div>
      </article>
    </SwipeableCard>
  )
}
