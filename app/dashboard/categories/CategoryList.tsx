'use client'

import { useCategories } from '@/lib/hooks/categories/useCategories'
import CategoryAddForm from './CategoryAddForm'
import CategoryEditRow from './CategoryEditRow'
import CategoryRow from './CategoryRow'

export default function CategoryList() {
  const {
    categories,
    adding,
    addError,
    editingId,
    setEditingId,
    deletingId,
    setDeletingId,
    newIcon,
    setNewIcon,
    newName,
    setNewName,
    editIcon,
    setEditIcon,
    editName,
    setEditName,
    openAdd,
    closeAdd,
    handleAdd,
    startEdit,
    handleSaveEdit,
    confirmDelete,
    handleDelete,
  } = useCategories()

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Categories</h1>
          <p className="mt-0.5 text-sm text-slate-500">{categories.length} categor{categories.length !== 1 ? 'ies' : 'y'}</p>
        </div>
        {!adding && (
          <button
            onClick={openAdd}
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
          >
            + New category
          </button>
        )}
      </div>

      {adding && (
        <CategoryAddForm
          icon={newIcon}
          onIconChange={setNewIcon}
          name={newName}
          onNameChange={setNewName}
          onAdd={handleAdd}
          onCancel={closeAdd}
          error={addError}
        />
      )}

      <div className="space-y-2">
        {categories.map(cat =>
          editingId === cat.id ? (
            <CategoryEditRow
              key={cat.id}
              icon={editIcon}
              onIconChange={setEditIcon}
              name={editName}
              onNameChange={setEditName}
              onSave={handleSaveEdit}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <CategoryRow
              key={cat.id}
              category={cat}
              isDeleting={deletingId === cat.id}
              onEdit={startEdit}
              onConfirmDelete={confirmDelete}
              onDelete={handleDelete}
              onCancelDelete={() => setDeletingId(null)}
            />
          )
        )}
      </div>

      {categories.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 text-4xl" aria-hidden="true">📂</div>
          <p className="text-slate-500">No categories yet. Create your first one.</p>
        </div>
      )}
    </main>
  )
}
