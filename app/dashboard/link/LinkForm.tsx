'use client'

import type { LinkStatus } from '@/lib/types/database'
import { STATUS_CONFIG } from '../config'
import { useLinkFormContext } from './LinkFormContext'

const INPUT = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
const LABEL = 'block text-sm font-medium text-slate-700 mb-1.5'

interface Props {
  scrollable?: boolean
}

export default function LinkForm({ scrollable = false }: Props) {
  const {
    url, setUrl,
    title, setTitle,
    categoryId, setCategoryId,
    status, setStatus,
    tags, setTags,
    notes, setNotes,
    submitting,
    error,
    categories,
    onSubmit,
    onCancel,
    submitLabel,
  } = useLinkFormContext()

  const fieldsCls = scrollable
    ? 'max-h-[70vh] overflow-y-auto px-6 py-5 space-y-4'
    : 'space-y-4'

  const footerCls = scrollable
    ? 'flex gap-3 border-t border-slate-100 px-6 py-4'
    : 'mt-6 flex gap-3'

  return (
    <>
      <div className={fieldsCls}>
        <div>
          <label className={LABEL}>URL</label>
          <input
            type="url"
            placeholder="https://..."
            className={INPUT}
            value={url}
            onChange={e => setUrl(e.target.value)}
          />
        </div>

        <div>
          <label className={LABEL}>Title</label>
          <input
            type="text"
            placeholder="Optional — auto-fetched later"
            className={INPUT}
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL}>Category</label>
            <select
              className={INPUT}
              value={categoryId ?? ''}
              onChange={e => setCategoryId(e.target.value || null)}
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.emoticon} {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={LABEL}>Status</label>
            <select
              className={INPUT}
              value={status}
              onChange={e => setStatus(e.target.value as LinkStatus)}
            >
              {(Object.keys(STATUS_CONFIG) as LinkStatus[]).map(s => (
                <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={LABEL}>Tags</label>
          <input
            type="text"
            placeholder="react, frontend, learning"
            className={INPUT}
            value={tags}
            onChange={e => setTags(e.target.value)}
          />
        </div>

        <div>
          <label className={LABEL}>Notes</label>
          <textarea
            placeholder="Personal notes..."
            rows={3}
            className={`${INPUT} resize-none`}
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>

        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
        )}
      </div>

      <div className={footerCls}>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting || !url.trim()}
          className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Saving…' : submitLabel}
        </button>
      </div>
    </>
  )
}
