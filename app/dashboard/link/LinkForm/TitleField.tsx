'use client'

import { useLinkFormContext } from '../LinkFormContext'
import { INPUT, LABEL } from './styles'

export default function TitleField() {
  const { title, setTitle, handleTitleChange, fetchingMeta } = useLinkFormContext()

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className={LABEL}>Title</label>
        {fetchingMeta && (
          <span className="text-xs text-surface-400 dark:text-surface-500">Fetching…</span>
        )}
      </div>
      <input
        type="text"
        placeholder={fetchingMeta ? '' : 'Optional — leave blank to auto-fetch'}
        className={INPUT}
        value={title}
        onChange={e => (handleTitleChange ?? setTitle)(e.target.value)}
      />
    </div>
  )
}
