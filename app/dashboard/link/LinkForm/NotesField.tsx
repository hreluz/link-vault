'use client'

import { useId } from 'react'
import { useLinkFormContext } from '../LinkFormContext'
import { INPUT, LABEL } from './styles'

export default function NotesField() {
  const { notes, setNotes } = useLinkFormContext()
  const id = useId()

  return (
    <div>
      <label htmlFor={id} className={LABEL}>Notes</label>
      <textarea
        id={id}
        placeholder="Personal notes..."
        rows={3}
        className={`${INPUT} resize-none`}
        value={notes}
        onChange={e => setNotes(e.target.value)}
      />
    </div>
  )
}
