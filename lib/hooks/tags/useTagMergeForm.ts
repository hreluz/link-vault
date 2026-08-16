'use client'

import { useState, useMemo, useEffect } from 'react'
import { mergeTag, getTagLinksCount, getMergePreview, type TagWithCount, type MergePreview } from '@/lib/services/tags'

const MAX_SUGGESTIONS = 8

export function useTagMergeForm(
  setTags: React.Dispatch<React.SetStateAction<TagWithCount[]>>,
  refetchTags: () => void,
  availableTags: { id: string; name: string; is_private: boolean }[],
) {
  const [mergingTag, setMergingTag] = useState<TagWithCount | null>(null)
  const [mergeQuery, setMergeQueryState] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [mergeTarget, setMergeTarget] = useState<{ id: string; name: string } | null>(null)
  const [mergeError, setMergeError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [mergePreview, setMergePreview] = useState<MergePreview | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  useEffect(() => {
    if (!mergingTag || !mergeTarget) { setMergePreview(null); return }
    let cancelled = false
    setPreviewLoading(true)
    getMergePreview(mergingTag.id, mergeTarget.id).then(preview => {
      if (cancelled) return
      setMergePreview(preview)
      setPreviewLoading(false)
    })
    return () => { cancelled = true }
  }, [mergingTag, mergeTarget])

  const suggestions = useMemo(() => {
    if (!mergingTag) return []
    const lower = mergeQuery.trim().toLowerCase()
    return availableTags
      .filter(t => t.id !== mergingTag.id
        && t.is_private === mergingTag.is_private
        && (lower === '' || t.name.toLowerCase().includes(lower)))
      .slice(0, MAX_SUGGESTIONS)
  }, [mergingTag, mergeQuery, availableTags])

  function startMerge(tag: TagWithCount) {
    setMergingTag(tag)
    setMergeQueryState('')
    setSelectedIndex(-1)
    setMergeTarget(null)
    setMergeError(null)
    setSubmitting(false)
  }

  function cancelMerging() {
    setMergingTag(null)
    setMergeQueryState('')
    setSelectedIndex(-1)
    setMergeTarget(null)
    setMergeError(null)
    setSubmitting(false)
  }

  function setMergeQuery(q: string) {
    setMergeQueryState(q)
    setSelectedIndex(-1)
  }

  function selectSuggestion(tag: { id: string; name: string }) {
    setMergeTarget(tag)
    setSelectedIndex(-1)
  }

  function cancelMerge() { setMergeTarget(null) }

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
    if (key === 'Enter' && selectedIndex >= 0) {
      selectSuggestion(suggestions[selectedIndex])
      return true
    }
    return false
  }

  async function confirmMerge() {
    if (!mergingTag || !mergeTarget || submitting) return
    setSubmitting(true)
    setMergeError(null)
    const ok = await mergeTag(mergingTag.id, mergeTarget.id)
    if (!ok) { setMergeError('Could not merge tags. Please try again.'); setSubmitting(false); return }
    const targetId = mergeTarget.id
    const newTargetCount = await getTagLinksCount(targetId)
    setTags(prev => prev
      .filter(t => t.id !== mergingTag.id)
      .map(t => t.id === targetId ? { ...t, link_count: newTargetCount } : t)
    )
    cancelMerging()
    refetchTags()
  }

  return {
    mergingTag,
    mergeQuery,
    setMergeQuery,
    selectedIndex,
    suggestions,
    mergeTarget,
    mergeError,
    submitting,
    mergePreview,
    previewLoading,
    startMerge,
    cancelMerging,
    selectSuggestion,
    cancelMerge,
    onKeyPress,
    confirmMerge,
  }
}
