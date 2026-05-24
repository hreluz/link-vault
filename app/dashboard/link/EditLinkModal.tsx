'use client'

import type { LinkWithTags } from '@/lib/services/links'
import type { ContentType, LinkStatus } from '@/lib/types/database'
import { CONTENT_TYPE_CONFIG, STATUS_CONFIG } from '../config'
import { useEditLinkForm } from '@/lib/hooks/links'

interface Props {
  link: LinkWithTags | null
  onSave: (updated: LinkWithTags) => void
  onClose: () => void
}

const INPUT = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
const LABEL = 'block text-sm font-medium text-slate-700 mb-1.5'

export default function EditLinkModal({ link, onSave, onClose }: Props) {
  const {
    url, setUrl,
    title, setTitle,
    description, setDescription,
    contentType, setContentType,
    status, setStatus,
    tags, setTags,
    notes, setNotes,
    submitting,
    error,
    handleSubmit,
  } = useEditLinkForm(link)

  if (!link) return null

  async function handleSave() {
    const updated = await handleSubmit()
    if (updated) {
      onSave(updated)
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
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl ring-1 ring-slate-200">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">Edit link</h2>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-4">
          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
          )}

          <div>
            <label className={LABEL}>URL</label>
            <input
              type="url"
              className={INPUT}
              value={url}
              onChange={e => setUrl(e.target.value)}
            />
          </div>

          <div>
            <label className={LABEL}>Title</label>
            <input
              type="text"
              className={INPUT}
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className={LABEL}>Description</label>
            <textarea
              rows={2}
              className={`${INPUT} resize-none`}
              value={description}
              onChange={e => setDescription(e.target.value)}
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
              rows={3}
              placeholder="Personal notes…"
              className={`${INPUT} resize-none`}
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={submitting || !url.trim() || !title.trim()}
            className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
