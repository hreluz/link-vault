'use client'

import { useState } from 'react'

function parseTags(raw: string): string[] {
  return raw.split(',').map(t => t.trim()).filter(Boolean)
}

function serialize(confirmed: string[], current: string): string {
  const all = current.trim() ? [...confirmed, current.trim()] : confirmed
  return all.join(', ')
}

export function useTagInput(initialTags: string, onChange: (tags: string) => void) {
  const [confirmedTags, setConfirmedTags] = useState<string[]>(() => parseTags(initialTags))
  const [currentInput, setCurrentInput] = useState('')

  function confirmCurrent() {
    const tag = currentInput.trim()
    if (!tag) return
    const next = [...confirmedTags, tag]
    setConfirmedTags(next)
    setCurrentInput('')
    onChange(serialize(next, ''))
  }

  function onKeyPress(key: string) {
    if (key === ',' || key === ' ' || key === 'Enter') {
      confirmCurrent()
    } else if (key === 'Backspace' && currentInput === '') {
      const next = confirmedTags.slice(0, -1)
      setConfirmedTags(next)
      onChange(serialize(next, ''))
    }
  }

  function onInputChange(value: string) {
    const cleaned = value.replace(/[#,]/g, '')
    setCurrentInput(cleaned)
    onChange(serialize(confirmedTags, cleaned))
  }

  function onPaste(text: string) {
    const parts = text.split(/[,\s]+/).map(p => p.replace(/#/g, '').trim()).filter(Boolean)
    if (parts.length > 1) {
      const next = [...confirmedTags, ...parts]
      setConfirmedTags(next)
      setCurrentInput('')
      onChange(serialize(next, ''))
    } else if (parts.length === 1) {
      const newInput = currentInput + parts[0]
      setCurrentInput(newInput)
      onChange(serialize(confirmedTags, newInput))
    }
  }

  return { confirmedTags, currentInput, confirmCurrent, onKeyPress, onInputChange, onPaste }
}
