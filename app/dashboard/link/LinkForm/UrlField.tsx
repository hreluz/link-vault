'use client'

import { useId } from 'react'
import { useLinkFormContext } from '../LinkFormContext'
import { INPUT, LABEL } from './styles'
import { SpinnerIcon } from '@/components/icons'

const READ_ONLY = 'cursor-default bg-surface-50! text-surface-500! focus:border-surface-200! focus:ring-0! dark:bg-surface-900! dark:text-surface-400! dark:focus:border-surface-700!'

export default function UrlField() {
  const { mode, url, setUrl, fetchingMeta, autoFetch, toggleAutoFetch, duplicateLinkId } = useLinkFormContext()
  const showToggle = toggleAutoFetch !== undefined
  const readOnly = mode === 'edit'
  const id = useId()

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor={id} className={LABEL}>URL</label>
        {readOnly && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="focus-ring -my-3.5 inline-flex min-h-11 items-center rounded-lg text-xs font-medium text-primary-600 hover:text-primary-500"
          >
            Open ↗
          </a>
        )}
        {showToggle && (
          <button
            type="button"
            onClick={toggleAutoFetch}
            role="switch"
            aria-checked={autoFetch}
            className="focus-ring -my-3.5 flex min-h-11 items-center gap-1.5 rounded-lg text-xs text-surface-500 transition hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200"
          >
            <span className={autoFetch ? 'text-surface-600 dark:text-surface-300' : 'text-surface-400 dark:text-surface-500'}>
              Auto-fetch
            </span>
            <span
              aria-hidden="true"
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
          id={id}
          data-autofocus={mode === 'add' || undefined}
          type="url"
          placeholder="https://..."
          className={`${INPUT} ${fetchingMeta ? 'pr-10' : ''} ${readOnly ? READ_ONLY : ''}`}
          value={url}
          readOnly={readOnly}
          onChange={e => setUrl(e.target.value)}
        />
        {fetchingMeta && (
          <SpinnerIcon className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-primary-500" />
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
