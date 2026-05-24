'use client'

import type { ContentType, LinkStatus } from '@/lib/types/database'
import { CONTENT_TYPE_CONFIG, STATUS_CONFIG } from '../config'
import { useAddLinkForm } from '@/lib/hooks/links'
import type { LinkWithTags } from '@/lib/services/links'

interface Props {
  isOpen: boolean
  onSuccess?: (link: LinkWithTags) => void
  onClose: () => void
}

const INPUT = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
const LABEL = 'block text-sm font-medium text-slate-700 mb-1.5'

export default function AddLinkModal({ isOpen, onSuccess, onClose }: Props) {
  const { url, setUrl, title, setTitle, contentType, setContentType, status, setStatus, tags, setTags, notes, setNotes, submitting, error, handleSubmit } = useAddLinkForm()

  if (!isOpen) return null

  async function handleSave() {
    const link = await handleSubmit()
    if (link) {
      onSuccess?.(link)
      onClose()
    }
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-200">
        <h2 className="mb-6 text-lg font-semibold text-slate-900">Add a link</h2>

        <div className="space-y-4">
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
                value={contentType}
                onChange={e => setContentType(e.target.value as ContentType)}
              >
                {(Object.keys(CONTENT_TYPE_CONFIG) as ContentType[]).map(ct => (
                  <option key={ct} value={ct}>
                    {CONTENT_TYPE_CONFIG[ct].icon} {CONTENT_TYPE_CONFIG[ct].label}
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
        </div>

        {error && (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
        )}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={submitting}
            className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Saving…' : 'Save link'}
          </button>
        </div>
      </div>
    </div>
  )
}
