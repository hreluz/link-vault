'use client'

import { useLinkFormContext } from '../LinkFormContext'
import { INPUT, LABEL } from './styles'

export default function TitleField() {
  const { title, setTitle } = useLinkFormContext()

  return (
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
  )
}
