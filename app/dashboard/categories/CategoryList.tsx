'use client'

import { useCategories } from '@/lib/hooks/categories/useCategories'
import CategoryForm from './CategoryForm'
import CategoryRow from './CategoryRow'

export default function CategoryList() {
  const {
    categories,
    adding,
    addError,
    editingId,
    editError,
    setEditingId,
    deletingId,
    setDeletingId,
    newIcon,
    setNewIcon,
    newName,
    setNewName,
    newColor,
    setNewColor,
    editIcon,
    setEditIcon,
    editName,
    setEditName,
    editColor,
    setEditColor,
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
        <CategoryForm
          icon={newIcon}
          onIconChange={setNewIcon}
          name={newName}
          onNameChange={setNewName}
          color={newColor}
          onColorChange={setNewColor}
          onSubmit={handleAdd}
          onCancel={closeAdd}
          submitLabel="Add category"
          title="New category"
          error={addError}
        />
      )}

      <div className="space-y-2">
        {categories.map(cat =>
          editingId === cat.id ? (
            <CategoryForm
              key={cat.id}
              icon={editIcon}
              onIconChange={setEditIcon}
              name={editName}
              onNameChange={setEditName}
              color={editColor}
              onColorChange={setEditColor}
              onSubmit={handleSaveEdit}
              onCancel={() => setEditingId(null)}
              submitLabel="Save"
              error={editError}
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
