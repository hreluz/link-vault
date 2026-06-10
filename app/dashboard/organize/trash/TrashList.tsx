'use client'

import { TrashProvider, useTrashContext } from './TrashContext'
import TrashHeader from './TrashHeader'
import TrashGrid from './TrashGrid'
import SearchBar from '@/components/SearchBar'

function TrashContent() {
  const { loading, searchQuery, setSearchQuery } = useTrashContext()

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Trash</h1>
        </div>
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <TrashHeader />
      <SearchBar value={searchQuery} onChange={setSearchQuery} />
      <TrashGrid />
    </main>
  )
}

export default function TrashList() {
  return (
    <TrashProvider>
      <TrashContent />
    </TrashProvider>
  )
}
