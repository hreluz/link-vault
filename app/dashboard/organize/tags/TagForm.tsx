'use client'

import { useTagContext } from './TagContext'
import { ColorPicker } from '@/components/ColorPicker'

interface Props {
  mode: 'add' | 'edit'
}

export function TagForm({ mode }: Props) {
  const {
    newName, newColor, newIsPrivate,
    setNewName, setNewColor, setNewIsPrivate,
    addTag, closeAdd, addError,
    editName, editColor, editIsPrivate,
    setEditName, setEditColor, setEditIsPrivate,
    setEditingId, saveEdit, editError,
  } = useTagContext()

  const isAdd = mode === 'add'
  const name = isAdd ? newName : editName
  const onNameChange = isAdd ? setNewName : setEditName
  const color = isAdd ? newColor : editColor
  const onColorChange = isAdd ? setNewColor : setEditColor
  const isPrivate = isAdd ? newIsPrivate : editIsPrivate
  const onIsPrivateChange = isAdd ? setNewIsPrivate : setEditIsPrivate
  const onSubmit = isAdd ? addTag : saveEdit
  const onCancel = isAdd ? closeAdd : () => setEditingId(null)
  const error = isAdd ? addError : editError

  return (
    <div className={`rounded-2xl bg-surface-card shadow-sm ring-1 dark:bg-surface-900 ${isAdd ? 'mb-4 p-5 ring-surface-200 dark:ring-surface-700' : 'p-4 ring-primary-200 dark:ring-primary-700'}`}>
      {isAdd && <p className="mb-3 text-sm font-semibold text-surface-700 dark:text-surface-300">New tag</p>}
      <input
        autoFocus
        type="text"
        placeholder={isAdd ? 'Tag name' : undefined}
        value={name}
        onChange={e => onNameChange(e.target.value.toLowerCase())}
        onKeyDown={e => { if (e.key === 'Enter') onSubmit(); if (e.key === 'Escape') onCancel() }}
        className={`w-full rounded-xl border border-surface-200 bg-surface-card px-4 text-sm text-surface-900 placeholder-surface-400 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100 dark:placeholder-surface-500 ${isAdd ? 'py-3' : 'py-2.5'}`}
      />
      <div className="mt-3">
        <ColorPicker selected={color} onChange={onColorChange} />
      </div>

      <label className="mt-3 flex cursor-pointer items-center gap-2.5">
        <input
          type="checkbox"
          checked={isPrivate}
          onChange={e => onIsPrivateChange(e.target.checked)}
          className="h-4 w-4 rounded border-surface-300 text-primary-600 accent-primary-600"
        />
        <span className="text-sm text-surface-700 dark:text-surface-300">Private tag</span>
      </label>

      {error && (
        <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</p>
      )}
      <div className={`flex gap-2 ${isAdd ? 'mt-4' : 'mt-3'}`}>
        <button
          onClick={onCancel}
          className={`rounded-xl border border-surface-200 bg-surface-card font-medium text-surface-600 transition hover:bg-surface-50 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-400 dark:hover:bg-surface-700 ${isAdd ? 'px-4 py-2 text-sm shadow-sm' : 'px-3 py-1.5 text-xs'}`}
        >
          Cancel
        </button>
        <button
          onClick={onSubmit}
          disabled={!name.trim()}
          className={`rounded-xl bg-primary-600 font-semibold text-white transition hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-60 ${isAdd ? 'px-4 py-2 text-sm shadow-sm' : 'px-3 py-1.5 text-xs'}`}
        >
          {isAdd ? 'Add tag' : 'Save'}
        </button>
      </div>
    </div>
  )
}
