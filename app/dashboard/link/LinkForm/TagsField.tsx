'use client'

import { useRef } from 'react'
import { useTagInput } from '@/lib/hooks/links/useTagInput'
import { useAvailableTags } from '@/lib/hooks/tags/useAvailableTags'
import { useLinkFormContext } from '../LinkFormContext'
import TagSuggestionsDropdown from '@/components/TagSuggestionsDropdown'
import { LABEL } from './styles'

export default function TagsField() {
  const { tags, setTags } = useLinkFormContext()
  const availableTags = useAvailableTags()
  const {
    confirmedTags, currentInput, onKeyPress, onInputChange, onPaste,
    suggestions, selectedIndex, selectSuggestion, closeSuggestions,
  } = useTagInput(tags, setTags, availableTags)
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div>
      <label className={LABEL}>Tags</label>
      <div className="relative">
        <div
          className="flex flex-wrap items-center gap-x-1.5 gap-y-1 w-full rounded-xl border border-surface-200 bg-surface-card px-4 py-3 text-sm transition cursor-text focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/20 dark:border-surface-700 dark:bg-surface-800"
          onClick={() => inputRef.current?.focus()}
        >
          {confirmedTags.map((tag, i) => (
            <span key={i} className="font-medium text-primary-600 whitespace-nowrap">#{tag}</span>
          ))}
          <input
            ref={inputRef}
            type="text"
            value={currentInput}
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
            className="flex-1 min-w-32 outline-none bg-transparent text-surface-900 placeholder-surface-400 dark:text-surface-100 dark:placeholder-surface-500"
          />
        </div>
        <TagSuggestionsDropdown suggestions={suggestions} selectedIndex={selectedIndex} onSelect={selectSuggestion} />
      </div>
    </div>
  )
}
