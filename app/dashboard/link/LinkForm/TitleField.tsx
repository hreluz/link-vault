'use client'

import { useId } from 'react'
import { useLinkFormContext } from '../LinkFormContext'
import { INPUT, LABEL } from './styles'

export default function TitleField() {
  const { mode, title, setTitle, handleTitleChange, fetchingMeta } = useLinkFormContext()
  const id = useId()

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor={id} className={LABEL}>Title</label>
        {fetchingMeta && (
          <span className="text-xs text-surface-400 dark:text-surface-500">Fetching…</span>
        )}
      </div>
      <input
        id={id}
        // URL is read-only in Edit, so Title is the first field worth landing in.
        data-autofocus={mode === 'edit' || undefined}
        type="text"
        placeholder={fetchingMeta ? '' : mode === 'edit' ? 'Defaults to the URL if left blank' : 'Optional — leave blank to auto-fetch'}
        className={INPUT}
        value={title}
        onChange={e => (handleTitleChange ?? setTitle)(e.target.value)}
      />
    </div>
  )
}
