'use client'

import { createContext, useContext } from 'react'
import type { LinkStatus } from '@/lib/types/database'
import type { Category } from '@/lib/services/categories'

export type LinkFormContextValue = {
  mode: 'add' | 'edit'
  url: string
  setUrl: (v: string) => void
  title: string
  setTitle: (v: string) => void
  handleTitleChange?: (v: string) => void
  description: string
  setDescription: (v: string) => void
  imageUrl: string
  setImageUrl: (v: string) => void
  duration: string
  setDuration: (v: string) => void
  fetchingMeta: boolean
  autoFetch?: boolean
  toggleAutoFetch?: () => void
  duplicateLinkId?: string | null
  categoryId: string | null
  setCategoryId: (v: string | null) => void
  status: LinkStatus
  setStatus: (v: LinkStatus) => void
  tags: string
  setTags: (v: string) => void
  notes: string
  setNotes: (v: string) => void
  submitting: boolean
  hasChanges?: boolean
  error: string | null
  categories: Category[]
  onSubmit: () => Promise<void>
  onCancel: () => void
  // Set only while the "discard unsaved changes?" prompt is showing (Edit only).
  discardPrompt?: { onKeepEditing: () => void, onDiscard: () => void }
  submitLabel: string
}

// The one rule for whether the form may submit, shared by the Save button and the
// form's submit handler so a keyboard submit (Enter, Cmd/Ctrl+Enter) can never do
// something a click on a disabled Save button couldn't.
export function canSubmitLinkForm(ctx: LinkFormContextValue) {
  return !ctx.submitting && ctx.url.trim() !== '' && ctx.hasChanges !== false && !ctx.discardPrompt
}

export const LinkFormContext = createContext<LinkFormContextValue | null>(null)

export function useLinkFormContext() {
  const ctx = useContext(LinkFormContext)
  if (!ctx) throw new Error('useLinkFormContext must be used within a LinkFormContext.Provider')
  return ctx
}
