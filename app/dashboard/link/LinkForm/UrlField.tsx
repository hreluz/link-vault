'use client'

import { useLinkFormContext } from '../LinkFormContext'
import { INPUT, LABEL } from './styles'

export default function UrlField() {
  const { url, setUrl } = useLinkFormContext()

  return (
    <div>
      <label className={LABEL}>URL</label>
      <input
        type="url"
        placeholder="https://..."
        className={INPUT}
        value={url}
        onChange={e => setUrl(e.target.value)}
      />
    </div>
  )
}
