'use client'

import { CategoriesProvider, useCategoriesContext } from './CategoriesContext'
import CategoryForm from './CategoryForm'
import CategoryRow from './CategoryRow'
import CategoryDomainsModal from './CategoryDomainsModal'

function CategoryListInner() {
  const { categories, adding, editingId, openAdd, createdCategory, setCreatedCategory } = useCategoriesContext()

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">Categories</h1>
          <p className="mt-0.5 text-sm text-surface-500 dark:text-surface-400">{categories.length} categor{categories.length !== 1 ? 'ies' : 'y'}</p>
        </div>
        {!adding && (
          <button
            onClick={openAdd}
            className="rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-500"
          >
            + New category
          </button>
        )}
      </div>

      {adding && <CategoryForm mode="add" />}

      <div className="space-y-2">
        {categories.map(cat =>
          editingId === cat.id ? (
            <CategoryForm key={cat.id} mode="edit" />
          ) : (
            <CategoryRow key={cat.id} category={cat} />
          )
        )}
      </div>

      {categories.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 text-4xl" aria-hidden="true">📂</div>
          <p className="text-surface-500 dark:text-surface-400">No categories yet. Create your first one.</p>
        </div>
      )}

      {createdCategory && (
        <CategoryDomainsModal
          category={createdCategory}
          onClose={() => setCreatedCategory(null)}
        />
      )}
    </main>
  )
}

export default function CategoryList() {
  return (
    <CategoriesProvider>
      <CategoryListInner />
    </CategoriesProvider>
  )
}
