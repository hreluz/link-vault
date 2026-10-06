'use client'

import { useId } from 'react'
import { useLinkFormContext } from '../LinkFormContext'
import { INPUT, LABEL } from './styles'

export default function DurationField() {
  const { duration, setDuration } = useLinkFormContext()
  const id = useId()

  return (
    <div>
      <label htmlFor={id} className={LABEL}>Duration</label>
      <input
        id={id}
        type="text"
        placeholder="e.g. 4:33 or 1:02:03"
        className={INPUT}
        value={duration}
        onChange={e => setDuration(e.target.value)}
      />
    </div>
  )
}
