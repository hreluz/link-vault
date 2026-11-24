'use client'

import { useEffect, useRef, useState } from 'react'
import Picker from '@emoji-mart/react'
import data from '@emoji-mart/data'
import { COLLECTION_DESCRIPTION_MAX, COLLECTION_NAME_MAX } from '@/lib/services/collections'

type Props = {
  title?: string
  name: string
  onNameChange: (value: string) => void
  emoji: string
  onEmojiChange: (value: string) => void
  description: string
  onDescriptionChange: (value: string) => void
  error: string | null
  saving: boolean
  submitLabel: string
  onSubmit: () => void
  onCancel: () => void
}

const INPUT = 'w-full rounded-xl border border-surface-200 bg-surface-card px-4 py-3 text-sm text-surface-900 placeholder-surface-400 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100 dark:placeholder-surface-500'

/** Inline name / emoji / description form, like CategoryForm. The parent hook owns the values. */
export default function CollectionForm({
  title, name, onNameChange, emoji, onEmojiChange, description, onDescriptionChange,
  error, saving, submitLabel, onSubmit, onCancel,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!pickerOpen) return
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [pickerOpen])

  return (
    <form
      onSubmit={e => { e.preventDefault(); onSubmit() }}
      onKeyDown={e => { if (e.key === 'Escape' && !pickerOpen) onCancel() }}
      className="mb-4 rounded-2xl bg-surface-card p-5 shadow-sm ring-1 ring-surface-200 dark:bg-surface-900 dark:ring-surface-700"
    >
      {title && <p className="mb-3 text-sm font-semibold text-surface-700 dark:text-surface-300">{title}</p>}
      <div className="flex gap-3">
        <div className="relative" ref={pickerRef}>
          <button
            type="button"
            onClick={() => setPickerOpen(v => !v)}
            aria-label={emoji ? `Emoji: ${emoji}. Change emoji` : 'Choose an emoji'}
            aria-expanded={pickerOpen}
            className="focus-ring flex h-full min-h-11 w-16 items-center justify-center rounded-xl border border-surface-200 bg-surface-card text-2xl transition hover:bg-surface-50 dark:border-surface-700 dark:bg-surface-800 dark:hover:bg-surface-700"
          >
            {emoji || <span className="text-sm text-surface-400">—</span>}
          </button>
          {pickerOpen && (
            <div className="absolute left-0 top-full z-50 mt-1">
              <Picker
                data={data}
                onEmojiSelect={(e: { native: string }) => { onEmojiChange(e.native); setPickerOpen(false) }}
                theme="light"
                previewPosition="none"
                skinTonePosition="none"
              />
            </div>
          )}
        </div>
        <label className="flex-1">
          <span className="sr-only">Collection name</span>
          <input
            autoFocus
            type="text"
            placeholder="Collection name"
            value={name}
            maxLength={COLLECTION_NAME_MAX}
            onChange={e => onNameChange(e.target.value)}
            className={INPUT}
          />
        </label>
      </div>
      {emoji && (
        <button
          type="button"
          onClick={() => onEmojiChange('')}
          className="focus-ring mt-1 inline-flex min-h-11 items-center rounded-lg text-xs text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200"
        >
          Remove emoji
        </button>
      )}
      <label className="mt-3 block">
        <span className="sr-only">Description</span>
        <input
          type="text"
          placeholder="Description (optional)"
          value={description}
          maxLength={COLLECTION_DESCRIPTION_MAX}
          onChange={e => onDescriptionChange(e.target.value)}
          className={INPUT}
        />
      </label>
      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</p>
      )}
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="focus-ring min-h-11 rounded-xl border border-surface-200 bg-surface-card px-4 py-2 text-sm font-medium text-surface-600 shadow-sm transition hover:bg-surface-50 hover:text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-400 dark:hover:bg-surface-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="focus-ring min-h-11 rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  )
}
