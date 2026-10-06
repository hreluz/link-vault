'use client'

import { useEffect, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { canSubmitLinkForm, useLinkFormContext } from '../LinkFormContext'
import CategoryStatusRow from './CategoryStatusRow'
import DescriptionField from './DescriptionField'
import DurationField from './DurationField'
import ExpandToggle from './ExpandToggle'
import FormFooter from './FormFooter'
import NotesField from './NotesField'
import TagsField from './TagsField'
import TitleField from './TitleField'
import UrlField from './UrlField'

interface Props {
  scrollable?: boolean
  collapsible?: boolean
}

export default function LinkForm({ scrollable = false, collapsible = false }: Props) {
  const [expanded, setExpanded] = useState(!collapsible)
  const ctx = useLinkFormContext()
  const { error, imageUrl, setImageUrl, duration } = ctx
  const errorRef = useRef<HTMLParagraphElement>(null)

  // The error sits below every field, so after a failed save from up in Title it can
  // be out of view; bring it in (a no-op if it's already visible).
  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ block: 'nearest' })
  }, [error])

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (canSubmitLinkForm(ctx)) void ctx.onSubmit()
  }

  // Plain Enter in a textarea has to insert a newline, so Cmd/Ctrl+Enter is the
  // submit shortcut there; it also works from any other field.
  function handleKeyDown(e: KeyboardEvent<HTMLFormElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      e.currentTarget.requestSubmit()
    }
  }

  const fieldsCls = scrollable
    ? 'max-h-[70vh] overflow-y-auto px-6 py-5 space-y-4'
    : 'space-y-4'

  const footerCls = scrollable
    ? 'flex gap-3 border-t border-surface-100 px-6 py-4 dark:border-surface-800'
    : 'mt-6 flex gap-3'

  // noValidate: the URL input is type="url", and native validation would block the
  // submit with a browser tooltip instead of letting the form show its own error.
  // flex-col + min-h-0 keep the fields scrolling inside AddLinkModal's capped column.
  return (
    <form noValidate onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="flex min-h-0 flex-col">
      <div className={fieldsCls}>
        <UrlField />

        {imageUrl && (
          <div className="overflow-hidden rounded-xl">
            <div className="relative">
              <img
                src={imageUrl}
                alt=""
                className="w-full object-cover"
                style={{ aspectRatio: '16/9' }}
                loading="lazy"
              />
              <button
                type="button"
                onClick={() => setImageUrl('')}
                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                aria-label="Remove image"
              >
                <span aria-hidden="true" className="text-sm">✕</span>
              </button>
              {duration && (
                <span className="absolute bottom-2 right-2 rounded-md bg-black/80 px-1.5 py-0.5 text-xs font-semibold text-white">
                  {duration}
                </span>
              )}
            </div>
          </div>
        )}

        {expanded && (
          <>
            <TitleField />
            <DescriptionField />
            <CategoryStatusRow />
            <TagsField />
            <DurationField />
            <NotesField />
          </>
        )}

        {collapsible && (
          <ExpandToggle expanded={expanded} onToggle={() => setExpanded(v => !v)} />
        )}

        {/* Always rendered: screen readers often miss a live region that's inserted
            together with its text, so only the message inside it comes and goes. */}
        <div aria-live="polite" className="empty:hidden">
          {error && (
            <p ref={errorRef} className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</p>
          )}
        </div>
      </div>

      <FormFooter className={footerCls} />
    </form>
  )
}
