'use client'

import { useLinkFormContext } from '../LinkFormContext'
import { INPUT, LABEL } from './styles'

export default function DurationField() {
  const { duration, setDuration } = useLinkFormContext()

  return (
    <div>
      <label className={LABEL}>Duration</label>
      <input
        type="text"
        placeholder="e.g. 4:33 or 1:02:03"
        className={INPUT}
        value={duration}
        onChange={e => setDuration(e.target.value)}
      />
    </div>
  )
}
