'use client'

import { useLinkFormContext } from '../LinkFormContext'
import { INPUT, LABEL } from './styles'

export default function TagsField() {
  const { tags, setTags } = useLinkFormContext()

  return (
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
  )
}
