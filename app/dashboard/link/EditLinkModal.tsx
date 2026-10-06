'use client'

import type { LinkWithTags } from '@/lib/services/links'
import { useEditLinkForm } from '@/lib/hooks/links'
import { useCategoryList } from '@/lib/hooks/categories/useCategoryList'
import { useBackdropClose } from '@/lib/hooks/shared/useBackdropClose'
import { useDialog } from '@/lib/hooks/shared/useDialog'
import { useDiscardGuard } from '@/lib/hooks/shared/useDiscardGuard'
import { toast } from 'sonner'
import { LinkFormContext } from './LinkFormContext'
import LinkForm from './LinkForm'

interface Props {
  link: LinkWithTags | null
  onSave: (updated: LinkWithTags) => void
  onClose: () => void
}

export default function EditLinkModal({ link, onSave, onClose }: Props) {
  const form = useEditLinkForm(link)
  const { categories } = useCategoryList()
  const guard = useDiscardGuard(form.hasChanges, onClose)
  const backdrop = useBackdropClose(guard.requestClose)
  // Escape acts like Cancel: it asks before discarding unsaved edits, means "Keep
  // editing" while that prompt is up, and does nothing mid-save.
  const dialog = useDialog({
    isOpen: link !== null,
    onClose: form.submitting ? () => {} : guard.confirming ? guard.keepEditing : guard.requestClose,
    // Edit opens from the bottom sheet's Edit button, which is gone by the time this
    // closes, so send focus back to the card's "Link options" button instead.
    returnFocus: () => link && document.querySelector<HTMLElement>(`[data-link-options="${CSS.escape(link.id)}"]`),
  })

  if (!link) return null

  const discardPrompt = guard.confirming
    ? { onKeepEditing: guard.keepEditing, onDiscard: guard.discard }
    : undefined

  async function handleSave() {
    const updated = await form.handleSubmit()
    if (updated) {
      onSave(updated)
      onClose()
      toast.success('Link updated')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      {...backdrop}
    >
      <div {...dialog.dialogProps} className="w-full max-w-md rounded-2xl bg-surface-card shadow-xl ring-1 ring-surface-200 outline-none dark:bg-surface-900 dark:ring-surface-700">
        <div className="border-b border-surface-100 px-6 py-4 dark:border-surface-800">
          <h2 id={dialog.titleId} className="text-base font-semibold text-surface-900 dark:text-surface-50">Edit link</h2>
        </div>
        <LinkFormContext.Provider value={{ ...form, mode: 'edit', categories, onSubmit: handleSave, onCancel: guard.requestClose, submitLabel: 'Save changes', discardPrompt }}>
          <LinkForm scrollable />
        </LinkFormContext.Provider>
      </div>
    </div>
  )
}
