'use client'

import { useRef } from 'react'
import { useTagInput } from '@/lib/hooks/links/useTagInput'
import { useLinkFormContext } from '../LinkFormContext'
import { LABEL } from './styles'

const CONFIRM_KEYS = new Set([',', ' ', 'Enter', 'Backspace'])

export default function TagsField() {
  const { tags, setTags } = useLinkFormContext()
  const { confirmedTags, currentInput, onKeyPress, onInputChange, onPaste } = useTagInput(tags, setTags)
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div>
      <label className={LABEL}>Tags</label>
      <div
        className="flex flex-wrap items-center gap-x-1.5 gap-y-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm transition cursor-text focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800"
        onClick={() => inputRef.current?.focus()}
      >
        {confirmedTags.map((tag, i) => (
          <span key={i} className="font-medium text-indigo-600 whitespace-nowrap">#{tag}</span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={currentInput}
          onChange={e => onInputChange(e.target.value)}
          onKeyDown={e => {
            if (CONFIRM_KEYS.has(e.key)) e.preventDefault()
            onKeyPress(e.key)
          }}
          onPaste={e => {
            e.preventDefault()
            onPaste(e.clipboardData.getData('text'))
          }}
          placeholder={confirmedTags.length === 0 ? 'react, frontend, learning' : ''}
          className="flex-1 min-w-32 outline-none bg-transparent text-slate-900 placeholder-slate-400 dark:text-slate-100 dark:placeholder-slate-500"
        />
      </div>
    </div>
  )
}
