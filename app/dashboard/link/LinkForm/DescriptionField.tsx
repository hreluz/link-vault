'use client'

import { useLinkFormContext } from '../LinkFormContext'
import { INPUT, LABEL } from './styles'

export default function DescriptionField() {
  const { description, setDescription, fetchingMeta } = useLinkFormContext()

  if (!fetchingMeta && !description) return null

  return (
    <div>
      <label className={LABEL}>Description</label>
      <textarea
        placeholder={fetchingMeta ? 'Fetching…' : 'Auto-fetched from page — edit or clear'}
        rows={2}
        className={`${INPUT} resize-none`}
        value={description}
        onChange={e => setDescription(e.target.value)}
      />
    </div>
  )
}
