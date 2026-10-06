'use client'

import { useLinkFormContext } from '../LinkFormContext'
import { INPUT, LABEL } from './styles'

const READ_ONLY = 'cursor-default bg-surface-50! text-surface-500! focus:border-surface-200! focus:ring-0! dark:bg-surface-900! dark:text-surface-400! dark:focus:border-surface-700!'

export default function UrlField() {
  const { mode, url, setUrl, fetchingMeta, autoFetch, toggleAutoFetch, duplicateLinkId } = useLinkFormContext()
  const showToggle = toggleAutoFetch !== undefined
  const readOnly = mode === 'edit'

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className={LABEL}>URL</label>
        {readOnly && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-primary-600 hover:text-primary-500"
          >
            Open ↗
          </a>
        )}
        {showToggle && (
          <button
            type="button"
            onClick={toggleAutoFetch}
            className="flex items-center gap-1.5 text-xs text-surface-500 transition hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200"
            aria-label={autoFetch ? 'Disable auto-fetch' : 'Enable auto-fetch'}
          >
            <span className={autoFetch ? 'text-surface-600 dark:text-surface-300' : 'text-surface-400 dark:text-surface-500'}>
              Auto-fetch
            </span>
            <span
              className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors ${
                autoFetch ? 'bg-primary-600' : 'bg-surface-300 dark:bg-surface-600'
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
          className={`${INPUT} ${fetchingMeta ? 'pr-10' : ''} ${readOnly ? READ_ONLY : ''}`}
          value={url}
          readOnly={readOnly}
          onChange={e => setUrl(e.target.value)}
        />
        {fetchingMeta && (
          <svg
            className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-primary-500"
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

      {readOnly && (
        <p className="mt-1.5 text-xs text-surface-500 dark:text-surface-400">
          To use a different URL, delete this link and save a new one.
        </p>
      )}

      {duplicateLinkId && (
        <p className="mt-1.5 text-xs text-surface-500 dark:text-surface-400">
          You already saved this link.
        </p>
      )}
    </div>
  )
}
