'use client'

import { useState, useMemo } from 'react'

function parseTags(raw: string): string[] {
  return raw.split(',').map(t => t.trim()).filter(Boolean)
}

function serialize(confirmed: string[], current: string): string {
  const all = current.trim() ? [...confirmed, current.trim()] : confirmed
  return all.join(', ')
}

export function useTagInput(
  initialTags: string,
  onChange: (tags: string) => void,
  availableTags: string[] = []
) {
  const [confirmedTags, setConfirmedTags] = useState<string[]>(() => parseTags(initialTags))
  const [currentInput, setCurrentInput] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(-1)

  const suggestions = useMemo(() => {
    if (!currentInput.trim()) return []
    const lower = currentInput.toLowerCase()
    return availableTags
      .filter(t => t.toLowerCase().includes(lower) && !confirmedTags.includes(t))
      .slice(0, 8)
  }, [currentInput, availableTags, confirmedTags])

  function selectSuggestion(tag: string) {
    const next = [...confirmedTags, tag]
    setConfirmedTags(next)
    setCurrentInput('')
    setSelectedIndex(-1)
    onChange(serialize(next, ''))
  }

  function closeSuggestions() {
    setSelectedIndex(-1)
  }

  function removeTag(index: number) {
    const next = confirmedTags.filter((_, i) => i !== index)
    setConfirmedTags(next)
    onChange(serialize(next, currentInput))
  }

  function confirmCurrent() {
    const tag = currentInput.trim().toLowerCase()
    if (!tag) return
    const next = [...confirmedTags, tag]
    setConfirmedTags(next)
    setCurrentInput('')
    setSelectedIndex(-1)
    onChange(serialize(next, ''))
  }

  /** Runs the key's effect, if any, and reports whether the caller should preventDefault. */
  function onKeyPress(key: string): boolean {
    if (key === 'ArrowDown') {
      if (!suggestions.length) return false
      setSelectedIndex(i => Math.min(i + 1, suggestions.length - 1))
      return true
    }
    if (key === 'ArrowUp') {
      if (!suggestions.length) return false
      setSelectedIndex(i => Math.max(i - 1, -1))
      return true
    }
    if (key === 'Escape') {
      if (!suggestions.length) return false
      setSelectedIndex(-1)
      return true
    }
    if ((key === 'Enter' || key === 'Tab') && selectedIndex >= 0 && suggestions[selectedIndex]) {
      selectSuggestion(suggestions[selectedIndex])
      return true
    }
    if (key === ',' || key === ' ' || key === 'Enter' || key === 'Tab') {
      confirmCurrent()
      // Tab should still move focus to the next field when no suggestions are open.
      return key === 'Tab' ? suggestions.length > 0 : true
    }
    if (key === 'Backspace') {
      if (currentInput !== '') return false
      const next = confirmedTags.slice(0, -1)
      setConfirmedTags(next)
      onChange(serialize(next, ''))
      return true
    }
    return false
  }

  function onInputChange(value: string) {
    const cleaned = value.replace(/[#,]/g, '').toLowerCase()
    setCurrentInput(cleaned)
    setSelectedIndex(-1)
    onChange(serialize(confirmedTags, cleaned))
  }

  function onPaste(text: string) {
    const parts = text.split(/[,\s]+/).map(p => p.replace(/#/g, '').trim().toLowerCase()).filter(Boolean)
    if (parts.length > 1) {
      const next = [...confirmedTags, ...parts]
      setConfirmedTags(next)
      setCurrentInput('')
      setSelectedIndex(-1)
      onChange(serialize(next, ''))
    } else if (parts.length === 1) {
      const newInput = currentInput + parts[0]
      setCurrentInput(newInput)
      setSelectedIndex(-1)
      onChange(serialize(confirmedTags, newInput))
    }
  }

  return {
    confirmedTags, currentInput, confirmCurrent, onKeyPress, onInputChange, onPaste,
    suggestions, selectedIndex, selectSuggestion, closeSuggestions, removeTag,
  }
}
