'use client'

import { useState, useRef, useEffect } from 'react'
import { useCategoryDomains } from '@/lib/hooks/categories/useCategoryDomains'
import type { Category } from '@/lib/services/categories'

interface Props {
  category: Category
  onClose: () => void
}

export default function CategoryDomainsModal({ category, onClose }: Props) {
  const { domains, loading, error, add, remove } = useCategoryDomains(category.id)
  const [input, setInput] = useState('')
  const [adding, setAdding] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  async function handleAdd() {
    if (!input.trim()) return
    setAdding(true)
    const ok = await add(input.trim())
    if (ok) setInput('')
    setAdding(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleAdd()
    if (e.key === 'Escape') onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-200">
        <div className="mb-5 flex items-center gap-2">
          <span className="text-xl" aria-hidden="true">{category.emoticon}</span>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">{category.name}</h2>
            <p className="text-xs text-slate-500">Domains linked to this category</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <div className="mb-4 flex gap-2">
          <input
            ref={inputRef}
            type="text"
            placeholder="e.g. example.com"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
          <button
            onClick={handleAdd}
            disabled={adding || !input.trim()}
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Add
          </button>
        </div>

        {error && (
          <p className="mb-3 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>
        )}

        {loading ? (
          <p className="py-4 text-center text-sm text-slate-400">Loading…</p>
        ) : domains.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-400">No domains yet. Add one above.</p>
        ) : (
          <ul className="space-y-2">
            {domains.map(d => (
              <li
                key={d.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5"
              >
                <span className="text-sm text-slate-700">{d.domain}</span>
                <button
                  onClick={() => remove(d.id)}
                  aria-label={`Remove ${d.domain}`}
                  className="ml-3 flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
