'use client'

import { useAddLinkForm } from '@/lib/hooks/links'
import { useAutoAssignCategory } from '@/lib/hooks/links/useAutoAssignCategory'
import { useCategoryList } from '@/lib/hooks/categories/useCategoryList'
import type { LinkWithTags } from '@/lib/services/links'
import { toast } from 'sonner'
import { LinkFormContext } from './LinkFormContext'
import LinkForm from './LinkForm'

interface Props {
  isOpen: boolean
  initialUrl?: string
  initialTitle?: string
  autoFetchDefault?: boolean
  onSuccess?: (link: LinkWithTags) => void
  onClose: () => void
}

export default function AddLinkModal({ isOpen, initialUrl, initialTitle, autoFetchDefault, onSuccess, onClose }: Props) {
  const form = useAddLinkForm(initialUrl, initialTitle, isOpen, autoFetchDefault)
  const { categories } = useCategoryList()
  useAutoAssignCategory(form, categories, isOpen)

  if (!isOpen) return null

  async function handleSave() {
    const link = await form.handleSubmit()
    if (link) {
      onSuccess?.(link)
      onClose()
      toast.success('Link saved')
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
      <div className="flex w-full max-w-md flex-col rounded-2xl bg-surface-card shadow-xl ring-1 ring-surface-200 dark:bg-surface-900 dark:ring-surface-700" style={{ maxHeight: '90dvh' }}>
        <div className="border-b border-surface-100 px-6 py-4 dark:border-surface-800">
          <h2 className="text-base font-semibold text-surface-900 dark:text-surface-50">Add a link</h2>
        </div>
        <LinkFormContext.Provider value={{ ...form, categories, onSubmit: handleSave, onCancel: onClose, submitLabel: 'Save link' }}>
          <LinkForm scrollable collapsible />
        </LinkFormContext.Provider>
      </div>
    </div>
  )
}
