'use client'

import { useState, useMemo } from 'react'

function parseTags(raw: string): string[] {
  return raw.split(',').map(t => t.trim()).filter(Boolean)
}

function serialize(confirmed: string[], current: string): string {
  const all = current.trim() ? [...confirmed, current.trim()] : confirmed
  return all.join(', ')
}

function matchesFor(text: string, availableTags: string[], confirmedTags: string[]): string[] {
  if (!text.trim()) return []
  const lower = text.toLowerCase()
  const matches = availableTags.filter(t => t.toLowerCase().includes(lower) && !confirmedTags.includes(t))
  // An exact match goes first, so Tab/Space (which take the first suggestion) complete to it.
  const exact = matches.indexOf(text.trim().toLowerCase())
  if (exact > 0) matches.unshift(...matches.splice(exact, 1))
  return matches.slice(0, 8)
}

export function useTagInput(
  initialTags: string,
  onChange: (tags: string) => void,
  availableTags: string[] = []
) {
  const [confirmedTags, setConfirmedTags] = useState<string[]>(() => parseTags(initialTags))
  const [currentInput, setCurrentInput] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(-1)
  // Set by Escape so the list actually closes (it's otherwise derived from the typed
  // text and would stay open); typing or pasting brings it back.
  const [dismissed, setDismissed] = useState(false)

  const suggestions = useMemo(
    () => (dismissed ? [] : matchesFor(currentInput, availableTags, confirmedTags)),
    [dismissed, currentInput, availableTags, confirmedTags],
  )

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
    confirmText(currentInput)
  }

  function confirmText(text: string) {
    const tag = text.trim().toLowerCase()
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
      setDismissed(true)
      return true
    }
    if ((key === 'Enter' || key === 'Tab' || key === ' ') && selectedIndex >= 0 && suggestions[selectedIndex]) {
      selectSuggestion(suggestions[selectedIndex])
      return true
    }
    // With nothing highlighted, Tab and Space complete to the first suggestion (Space is
    // the only way to do it on phones, which have no Tab key); Enter keeps the typed text.
    if ((key === 'Tab' || key === ' ') && suggestions.length) {
      selectSuggestion(suggestions[0])
      return true
    }
    if (key === ','|| key === ' ' || key === 'Enter' || key === 'Tab') {
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
    const lowered = value.replace(/[#,]/g, '').toLowerCase()
    const cleaned = lowered.replace(/\s+/g, '')
    // Many Android keyboards send keydown as "Unidentified", so Space never reaches
    // onKeyPress and lands in the value instead; a trailing space acts like Space there.
    if (/\s$/.test(lowered) && cleaned) {
      const matches = dismissed ? [] : matchesFor(cleaned, availableTags, confirmedTags)
      if (matches.length) selectSuggestion(matches[selectedIndex >= 0 && selectedIndex < matches.length ? selectedIndex : 0])
      else confirmText(cleaned)
      return
    }
    setCurrentInput(cleaned)
    setSelectedIndex(-1)
    setDismissed(false)
    onChange(serialize(confirmedTags, cleaned))
  }

  function onPaste(text: string) {
    setDismissed(false)
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
