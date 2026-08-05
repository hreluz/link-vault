'use client'

import { useState } from 'react'
import { useTagInput } from '@/lib/hooks/links/useTagInput'
import { useAvailableTags } from '@/lib/hooks/tags/useAvailableTags'
import { useLinkListContext } from './LinkListContext'
import TagSuggestionsDropdown from '@/components/TagSuggestionsDropdown'

interface Props {
  onClose: () => void
}

export default function BulkTagModal({ onClose }: Props) {
  const { handleBulkTagSelected } = useLinkListContext()
  const [tagString, setTagString] = useState('')
  const availableTags = useAvailableTags()
  const {
    confirmedTags, currentInput, onKeyPress, onInputChange, onPaste,
    suggestions, selectedIndex, selectSuggestion, closeSuggestions, removeTag,
  } = useTagInput('', setTagString, availableTags)

  function handleConfirm() {
    const finalTags = currentInput.trim()
      ? [...confirmedTags, currentInput.trim()]
      : confirmedTags

    if (!finalTags.length) return
    handleBulkTagSelected(finalTags)
    onClose()
  }

  const allTags = currentInput.trim() ? [...confirmedTags, currentInput.trim()] : confirmedTags
  const hasContent = allTags.length > 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:px-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md rounded-t-2xl bg-surface-card shadow-xl ring-1 ring-surface-200 sm:rounded-2xl dark:bg-surface-900 dark:ring-surface-700">
        <div className="flex justify-center pb-1 pt-3 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-surface-200 dark:bg-surface-700" />
        </div>

        <div className="flex items-center justify-between border-b border-surface-100 px-5 py-4 dark:border-surface-800">
          <h2 className="text-base font-semibold text-surface-900 dark:text-surface-50">Add tags</h2>
          <button
            onClick={onClose}
            className="text-sm font-medium text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200"
          >
            Cancel
          </button>
        </div>

        <div className="p-5">
          <p className="mb-3 text-xs text-surface-500 dark:text-surface-400">
            Tags will be added to all selected links without replacing existing ones.
          </p>

          <div className="relative">
            <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-xl border border-surface-200 bg-surface-card px-3 py-2 focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/20 dark:border-surface-700 dark:bg-surface-800">
              {confirmedTags.map((tag, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-full bg-primary-100 py-0.5 pl-2.5 pr-1.5 text-xs font-medium text-primary-700 dark:bg-primary-900/40 dark:text-primary-300"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(i)}
                    className="flex h-4 w-4 items-center justify-center rounded-full text-primary-700/70 transition hover:bg-primary-200 hover:text-primary-700 dark:text-primary-300/70 dark:hover:bg-primary-800 dark:hover:text-primary-200"
                    aria-label={`Remove tag ${tag}`}
                  >
                    <span aria-hidden="true" className="text-[10px]">✕</span>
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={currentInput}
                placeholder={confirmedTags.length === 0 ? 'Type tags, separated by commas…' : ''}
                className="min-w-30 flex-1 bg-transparent text-sm text-surface-900 placeholder-surface-400 outline-none dark:text-surface-50"
                onChange={e => onInputChange(e.target.value)}
                onKeyDown={e => {
                  if (onKeyPress(e.key)) e.preventDefault()
                }}
                onPaste={e => {
                  e.preventDefault()
                  onPaste(e.clipboardData.getData('text'))
                }}
                onBlur={closeSuggestions}
                autoFocus
              />
            </div>
            <TagSuggestionsDropdown suggestions={suggestions} selectedIndex={selectedIndex} onSelect={selectSuggestion} />
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="rounded-xl border border-surface-200 bg-surface-card px-4 py-2 text-sm font-medium text-surface-600 shadow-sm transition hover:bg-surface-50 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!hasContent}
              className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Add tags
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
