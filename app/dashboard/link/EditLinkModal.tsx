'use client'

import type { LinkWithTags } from '@/lib/services/links'
import { useEditLinkForm } from '@/lib/hooks/links'
import { useCategoryList } from '@/lib/hooks/categories/useCategoryList'
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

  if (!link) return null

  async function handleSave() {
    const updated = await form.handleSubmit()
    if (updated) {
      onSave(updated)
      onClose()
      toast.success('Link updated')
    }
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-md rounded-2xl bg-surface-card shadow-xl ring-1 ring-surface-200 dark:bg-surface-900 dark:ring-surface-700">
        <div className="border-b border-surface-100 px-6 py-4 dark:border-surface-800">
          <h2 className="text-base font-semibold text-surface-900 dark:text-surface-50">Edit link</h2>
        </div>
        <LinkFormContext.Provider value={{ ...form, categories, onSubmit: handleSave, onCancel: onClose, submitLabel: 'Save changes' }}>
          <LinkForm scrollable />
        </LinkFormContext.Provider>
      </div>
    </div>
  )
}
