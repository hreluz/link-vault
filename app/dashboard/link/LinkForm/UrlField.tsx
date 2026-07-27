'use client'

import { useLinkFormContext } from '../LinkFormContext'
import { INPUT, LABEL } from './styles'

export default function UrlField() {
  const { url, setUrl, fetchingMeta, autoFetch, toggleAutoFetch, duplicateLinkId } = useLinkFormContext()
  const showToggle = toggleAutoFetch !== undefined

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className={LABEL}>URL</label>
        {showToggle && (
          <button
            type="button"
            onClick={toggleAutoFetch}
            className="flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            aria-label={autoFetch ? 'Disable auto-fetch' : 'Enable auto-fetch'}
          >
            <span className={autoFetch ? 'text-slate-600 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500'}>
              Auto-fetch
            </span>
            <span
              className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors ${
                autoFetch ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'
              }`}
            >
              <span
                className={`inline-block h-3 w-3 rounded-full bg-white shadow-sm transition-transform ${
                  autoFetch ? 'translate-x-3.5' : 'translate-x-0.5'
                }`}
              />
            </span>
          </button>
        )}
      </div>

      <div className="relative">
        <input
          type="url"
          placeholder="https://..."
          className={`${INPUT} ${fetchingMeta ? 'pr-10' : ''}`}
          value={url}
          onChange={e => setUrl(e.target.value)}
        />
        {fetchingMeta && (
          <svg
            className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-indigo-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
      </div>

      {duplicateLinkId && (
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
          You already saved this link.
        </p>
      )}
    </div>
  )
}
