'use client'

import { useId, useRef } from 'react'
import { useTagInput } from '@/lib/hooks/links/useTagInput'
import { useAvailableTags } from '@/lib/hooks/tags/useAvailableTags'
import TagSuggestionsDropdown from '@/components/TagSuggestionsDropdown'

type Props = {
  label: string
  /** Comma-separated tag names, the same format useTagInput already uses. */
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  /** Optional id of a hint element, for aria-describedby. */
  describedBy?: string
  /** Puts data-autofocus="always" on the input, so a dialog focuses it on open. */
  autoFocusInDialog?: boolean
}

export default function TagChipsInput({ label, value, onChange, disabled = false, describedBy, autoFocusInDialog = false }: Props) {
  const availableTags = useAvailableTags()
  const {
    confirmedTags, currentInput, onKeyPress, onInputChange, onPaste,
    suggestions, selectedIndex, selectSuggestion, closeSuggestions, removeTag,
  } = useTagInput(value, onChange, availableTags)
  const inputRef = useRef<HTMLInputElement>(null)
  const id = useId()

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-surface-700 mb-1.5 dark:text-surface-300">{label}</label>
      <div className="relative">
        <div
          className={`flex flex-wrap items-center gap-x-1.5 gap-y-1 w-full rounded-xl border border-surface-200 bg-surface-card px-4 py-3 text-sm transition focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/20 dark:border-surface-700 dark:bg-surface-800 ${
            disabled ? 'cursor-not-allowed opacity-50' : 'cursor-text'
          }`}
          onClick={() => inputRef.current?.focus()}
        >
          {confirmedTags.map((tag, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-primary-100 py-0.5 pl-2.5 pr-1.5 text-xs font-medium text-primary-700 dark:bg-primary-900/40 dark:text-primary-300"
            >
              #{tag}
              <button
                type="button"
                onClick={() => removeTag(i)}
                disabled={disabled}
                className="flex h-4 w-4 items-center justify-center rounded-full text-primary-700/70 transition hover:bg-primary-200 hover:text-primary-700 disabled:cursor-not-allowed disabled:hover:bg-transparent dark:text-primary-300/70 dark:hover:bg-primary-800 dark:hover:text-primary-200"
                aria-label={`Remove tag ${tag}`}
              >
                <span aria-hidden="true" className="text-[10px]">✕</span>
              </button>
            </span>
          ))}
          <input
            id={id}
            ref={inputRef}
            data-autofocus={autoFocusInDialog ? 'always' : undefined}
            type="text"
            value={currentInput}
            disabled={disabled}
            aria-describedby={describedBy}
            onChange={e => onInputChange(e.target.value)}
            onKeyDown={e => {
              if (onKeyPress(e.key)) e.preventDefault()
            }}
            onPaste={e => {
              e.preventDefault()
              onPaste(e.clipboardData.getData('text'))
            }}
            onBlur={closeSuggestions}
            placeholder={confirmedTags.length === 0 ? 'react, frontend, learning' : ''}
            className="flex-1 min-w-32 outline-none bg-transparent text-surface-900 placeholder-surface-400 disabled:cursor-not-allowed dark:text-surface-100 dark:placeholder-surface-500"
          />
        </div>
        <TagSuggestionsDropdown
          suggestions={suggestions}
          selectedIndex={selectedIndex}
          onSelect={selectSuggestion}
          hintIndex={selectedIndex < 0 ? 0 : undefined}
        />
      </div>
    </div>
  )
}
