'use client'

import { useLinkFormContext } from '../LinkFormContext'
import { INPUT, LABEL } from './styles'

export default function DescriptionField() {
  const { mode, description, setDescription, fetchingMeta } = useLinkFormContext()

  // In Add the field only appears once auto-fetch has something to show; in Edit it's
  // always present so a description can be added to a link saved without one.
  if (mode === 'add' && !fetchingMeta && !description) return null

  return (
    <div>
      <label className={LABEL}>Description</label>
      <textarea
        placeholder={fetchingMeta ? 'Fetching…' : mode === 'edit' ? 'Short summary (optional)' : 'Auto-fetched from page — edit or clear'}
        rows={2}
        className={`${INPUT} resize-none`}
        value={description}
        onChange={e => setDescription(e.target.value)}
      />
    </div>
  )
}
