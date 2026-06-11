'use client'

import { useState } from 'react'
import type { Category } from '@/lib/services/categories'

type Filter = string | 'all'
type TagMode = 'any' | 'all'
export type SortBy = 'newest' | 'oldest' | 'alphabetical' | 'status'

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: 'newest',       label: 'Newest first' },
  { value: 'oldest',       label: 'Oldest first' },
  { value: 'alphabetical', label: 'A → Z' },
  { value: 'status',       label: 'By status' },
]

interface Props {
  isOpen: boolean
  sortBy: SortBy
  category: Filter
  categories: Category[]
  selectedTags: string[]
  tagMode: TagMode
  allTags: string[]
  resultCount: number
  onSortChange: (s: SortBy) => void
  onCategoryChange: (c: Filter) => void
  onTagsChange: (tags: string[]) => void
  onTagModeChange: (mode: TagMode) => void
  onReset: () => void
  onClose: () => void
}

type SectionKey = 'sort' | 'category' | 'tags'

function initOpen(props: Pick<Props, 'sortBy' | 'category' | 'selectedTags'>): Set<SectionKey> {
  const open = new Set<SectionKey>()
  if (props.sortBy !== 'newest') open.add('sort')
  if (props.category !== 'all') open.add('category')
  if (props.selectedTags.length > 0) open.add('tags')
  return open
}

function AccordionSection({
  label, badge, open, onToggle, children,
}: {
  label: string
  badge?: React.ReactNode
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="border-b border-slate-100 last:border-0 dark:border-slate-800">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between py-4 text-left"
      >
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</span>
        <div className="flex items-center gap-2">
          {badge}
          <span className={`text-slate-400 transition-transform duration-200 dark:text-slate-500 ${open ? 'rotate-180' : ''}`}>
            ▾
          </span>
        </div>
      </button>
      <div className={`grid transition-all duration-200 ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <div className="pb-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function FilterSheet({
  isOpen, sortBy, category, categories, selectedTags, tagMode, allTags, resultCount,
  onSortChange, onCategoryChange, onTagsChange, onTagModeChange, onReset, onClose,
}: Props) {
  const [openSections, setOpenSections] = useState<Set<SectionKey>>(
    () => initOpen({ sortBy, category, selectedTags })
  )

  if (!isOpen) return null

  function toggle(section: SectionKey) {
    setOpenSections(prev => {
      const next = new Set(prev)
      next.has(section) ? next.delete(section) : next.add(section)
      return next
    })
  }

  function toggleTag(tag: string) {
    onTagsChange(
      selectedTags.includes(tag)
        ? selectedTags.filter(t => t !== tag)
        : [...selectedTags, tag]
    )
  }

  const hasFilters = sortBy !== 'newest' || category !== 'all' || selectedTags.length > 0

  const sortLabel = SORT_OPTIONS.find(o => o.value === sortBy)?.label
  const activeCategory = categories.find(c => c.id === category)
  const categoryLabel = activeCategory ? `${activeCategory.emoticon ?? ''} ${activeCategory.name}`.trim() : undefined

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
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">Filters & Sort</h2>
          {hasFilters && (
            <button
              onClick={onReset}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              Reset all
            </button>
          )}
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-5">
          <AccordionSection
            label="Category"
            open={openSections.has('category')}
            onToggle={() => toggle('category')}
            badge={
              category !== 'all'
                ? <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">{categoryLabel}</span>
                : undefined
            }
          >
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onCategoryChange('all')}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  category === 'all'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                }`}
              >
                All
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => onCategoryChange(cat.id)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                    category === cat.id
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                  }`}
                >
                  {cat.emoticon} {cat.name}
                </button>
              ))}
            </div>
          </AccordionSection>

          <AccordionSection
            label="Tags"
            open={openSections.has('tags')}
            onToggle={() => toggle('tags')}
            badge={
              selectedTags.length > 0
                ? (
                  <div className="flex items-center gap-1.5">
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">{selectedTags.length}</span>
                    <div className="flex rounded-md border border-slate-200 p-0.5 dark:border-slate-700">
                      {(['any', 'all'] as TagMode[]).map(mode => (
                        <button
                          key={mode}
                          onClick={e => { e.stopPropagation(); onTagModeChange(mode) }}
                          className={`rounded px-2 py-0.5 text-xs font-medium capitalize transition ${
                            tagMode === mode
                              ? 'bg-indigo-600 text-white'
                              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                          }`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>
                )
                : undefined
            }
          >
            <div className="flex flex-wrap gap-2">
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                    selectedTags.includes(tag)
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </AccordionSection>

          <AccordionSection
            label="Sort by"
            open={openSections.has('sort')}
            onToggle={() => toggle('sort')}
            badge={
              sortBy !== 'newest'
                ? <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">{sortLabel}</span>
                : undefined
            }
          >
            <div className="flex flex-wrap gap-2">
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => onSortChange(opt.value)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                    sortBy === opt.value
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </AccordionSection>
        </div>

        <div className="border-t border-slate-100 px-5 py-4 dark:border-slate-800">
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
