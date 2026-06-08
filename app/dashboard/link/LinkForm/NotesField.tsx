'use client'

import { useLinkFormContext } from '../LinkFormContext'
import { INPUT, LABEL } from './styles'

export default function NotesField() {
  const { notes, setNotes } = useLinkFormContext()

  return (
    <div>
      <label className={LABEL}>Notes</label>
      <textarea
        placeholder="Personal notes..."
        rows={3}
        className={`${INPUT} resize-none`}
        value={notes}
        onChange={e => setNotes(e.target.value)}
      />
    </div>
  )
}
