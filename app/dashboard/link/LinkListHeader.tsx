'use client'

import { useLinkListContext } from './LinkListContext'

export default function LinkListHeader() {
  const { results, setModalOpen } = useLinkListContext()

  return (
    <div className="mb-5 flex items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Your Links</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          {results.length} link{results.length !== 1 ? 's' : ''}
        </p>
      </div>
      <button
        onClick={() => setModalOpen(true)}
        className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
      >
        + Add link
      </button>
    </div>
  )
}
