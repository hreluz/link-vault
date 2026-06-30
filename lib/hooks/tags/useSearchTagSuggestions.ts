'use client'

import { useState, useMemo } from 'react'

const MAX_SUGGESTIONS = 8
const TRAILING_HASHTAG = /#(\w*)$/

export function useSearchTagSuggestions(
  query: string,
  onChange: (q: string) => void,
  availableTags: string[] = []
) {
  const [selectedIndex, setSelectedIndex] = useState(-1)

  const activeFragment = useMemo(() => {
    const match = query.match(TRAILING_HASHTAG)
    return match ? match[1] : null
  }, [query])

  // Reset the highlighted suggestion whenever the fragment being typed changes.
  const [trackedFragment, setTrackedFragment] = useState(activeFragment)
  if (activeFragment !== trackedFragment) {
    setTrackedFragment(activeFragment)
    setSelectedIndex(-1)
  }

  const suggestions = useMemo(() => {
    if (activeFragment === null) return []
    const lower = activeFragment.toLowerCase()
    return availableTags.filter(t => t.toLowerCase().includes(lower)).slice(0, MAX_SUGGESTIONS)
  }, [activeFragment, availableTags])

  function selectSuggestion(tag: string) {
    onChange(query.replace(TRAILING_HASHTAG, `#${tag} `))
    setSelectedIndex(-1)
  }

  function closeSuggestions() {
    setSelectedIndex(-1)
  }

  /** Runs the key's effect, if any, and reports whether the caller should preventDefault. */
  function onKeyPress(key: string): boolean {
    if (!suggestions.length) return false
    if (key === 'ArrowDown') {
      setSelectedIndex(i => Math.min(i + 1, suggestions.length - 1))
      return true
    }
    if (key === 'ArrowUp') {
      setSelectedIndex(i => Math.max(i - 1, -1))
      return true
    }
    if (key === 'Escape') {
      setSelectedIndex(-1)
      return true
    }
    if ((key === 'Enter' || key === 'Tab') && selectedIndex >= 0) {
      selectSuggestion(suggestions[selectedIndex])
      return true
    }
    return false
  }

  return { suggestions, selectedIndex, onKeyPress, selectSuggestion, closeSuggestions }
}
