'use client'

import { useAddLinkForm } from '@/lib/hooks/links'
import { useCategoryList } from '@/lib/hooks/categories/useCategoryList'
import type { LinkWithTags } from '@/lib/services/links'
import { toast } from 'sonner'
import { LinkFormContext } from './LinkFormContext'
import LinkForm from './LinkForm'

interface Props {
  isOpen: boolean
  onSuccess?: (link: LinkWithTags) => void
  onClose: () => void
}

export default function AddLinkModal({ isOpen, onSuccess, onClose }: Props) {
  const form = useAddLinkForm()
  const { categories } = useCategoryList()

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
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-200">
        <h2 className="mb-6 text-lg font-semibold text-slate-900">Add a link</h2>
        <LinkFormContext.Provider value={{ ...form, categories, onSubmit: handleSave, onCancel: onClose, submitLabel: 'Save link' }}>
          <LinkForm />
        </LinkFormContext.Provider>
      </div>
    </div>
  )
}
