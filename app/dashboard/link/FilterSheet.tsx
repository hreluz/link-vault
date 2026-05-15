'use client'

import { MOCK_LINKS } from '@/lib/mock-data'
import { CONTENT_TYPE_FILTERS } from '../config'
import type { ContentType } from '@/lib/types/database'

type Filter = ContentType | 'all'

const ALL_TAGS = Array.from(new Set(MOCK_LINKS.flatMap(l => l.tags))).sort()

type TagMode = 'any' | 'all'

interface Props {
  isOpen: boolean
  category: Filter
  selectedTags: string[]
  tagMode: TagMode
  resultCount: number
  onCategoryChange: (c: Filter) => void
  onTagsChange: (tags: string[]) => void
  onTagModeChange: (mode: TagMode) => void
  onReset: () => void
  onClose: () => void
}

export default function FilterSheet({
  isOpen, category, selectedTags, tagMode, resultCount,
  onCategoryChange, onTagsChange, onTagModeChange, onReset, onClose,
}: Props) {
  if (!isOpen) return null

  function toggleTag(tag: string) {
    onTagsChange(
      selectedTags.includes(tag)
        ? selectedTags.filter(t => t !== tag)
        : [...selectedTags, tag]
    )
  }

  const hasFilters = category !== 'all' || selectedTags.length > 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:px-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md rounded-t-2xl bg-white shadow-xl ring-1 ring-slate-200 sm:rounded-2xl">
        <div className="flex justify-center pb-1 pt-3 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-slate-200" />
        </div>

        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">Filters</h2>
          {hasFilters && (
            <button
              onClick={onReset}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              Reset
            </button>
          )}
        </div>

        <div className="max-h-[55vh] space-y-6 overflow-y-auto px-5 py-5">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Category</p>
            <div className="flex flex-wrap gap-2">
              {CONTENT_TYPE_FILTERS.map(tab => {
                const active = category === tab.value
                return (
                  <button
                    key={tab.value}
                    onClick={() => onCategoryChange(tab.value as Filter)}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                      active
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Tags</p>
              {selectedTags.length > 0 && (
                <div className="flex rounded-lg border border-slate-200 p-0.5">
                  {(['any', 'all'] as TagMode[]).map(mode => (
                    <button
                      key={mode}
                      onClick={() => onTagModeChange(mode)}
                      className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition ${
                        tagMode === mode
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {ALL_TAGS.map(tag => {
                const active = selectedTags.includes(tag)
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                      active
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tag}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 px-5 py-4">
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
          >
            Show {resultCount} link{resultCount !== 1 ? 's' : ''}
          </button>
        </div>

        <div className="h-2 sm:hidden" />
      </div>
    </div>
  )
}
