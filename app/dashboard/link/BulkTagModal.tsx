'use client'

import { useState } from 'react'
import { useTagInput } from '@/lib/hooks/links/useTagInput'
import { useLinkListContext } from './LinkListContext'

interface Props {
  onClose: () => void
}

export default function BulkTagModal({ onClose }: Props) {
  const { handleBulkTagSelected } = useLinkListContext()
  const [tagString, setTagString] = useState('')
  const { confirmedTags, currentInput, confirmCurrent, onKeyPress, onInputChange, onPaste } = useTagInput('', setTagString)

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
      <div className="w-full max-w-md rounded-t-2xl bg-white shadow-xl ring-1 ring-slate-200 sm:rounded-2xl dark:bg-slate-900 dark:ring-slate-700">
        <div className="flex justify-center pb-1 pt-3 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-slate-200 dark:bg-slate-700" />
        </div>

        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">Add tags</h2>
          <button
            onClick={onClose}
            className="text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            Cancel
          </button>
        </div>

        <div className="p-5">
          <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
            Tags will be added to all selected links without replacing existing ones.
          </p>

          <div className="flex min-h-[44px] flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800">
            {confirmedTags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
              >
                {tag}
              </span>
            ))}
            <input
              type="text"
              value={currentInput}
              placeholder={confirmedTags.length === 0 ? 'Type tags, separated by commas…' : ''}
              className="min-w-[120px] flex-1 bg-transparent text-sm text-slate-900 placeholder-slate-400 outline-none dark:text-slate-50"
              onChange={e => onInputChange(e.target.value)}
              onKeyDown={e => onKeyPress(e.key)}
              onPaste={e => {
                e.preventDefault()
                onPaste(e.clipboardData.getData('text'))
              }}
              autoFocus
            />
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!hasContent}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Add tags
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
