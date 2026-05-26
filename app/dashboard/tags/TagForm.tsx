'use client'

import { useTagContext } from './TagContext'
import { ColorPicker } from '@/components/ColorPicker'

interface Props {
  mode: 'add' | 'edit'
}

export function TagForm({ mode }: Props) {
  const {
    newName, newColor, setNewName, setNewColor, addTag, closeAdd, addError,
    editName, editColor, setEditName, setEditColor, setEditingId, saveEdit, editError,
  } = useTagContext()

  const isAdd = mode === 'add'
  const name = isAdd ? newName : editName
  const onNameChange = isAdd ? setNewName : setEditName
  const color = isAdd ? newColor : editColor
  const onColorChange = isAdd ? setNewColor : setEditColor
  const onSubmit = isAdd ? addTag : saveEdit
  const onCancel = isAdd ? closeAdd : () => setEditingId(null)
  const error = isAdd ? addError : editError

  return (
    <div className={`rounded-2xl bg-white shadow-sm ring-1 ${isAdd ? 'mb-4 p-5 ring-slate-200' : 'p-4 ring-indigo-200'}`}>
      {isAdd && <p className="mb-3 text-sm font-semibold text-slate-700">New tag</p>}
      <input
        autoFocus
        type="text"
        placeholder={isAdd ? 'Tag name' : undefined}
        value={name}
        onChange={e => onNameChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') onSubmit(); if (e.key === 'Escape') onCancel() }}
        className={`w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 ${isAdd ? 'py-3' : 'py-2.5'}`}
      />
      <div className="mt-3">
        <ColorPicker selected={color} onChange={onColorChange} />
      </div>
      {error && (
        <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
      )}
      <div className={`flex gap-2 ${isAdd ? 'mt-4' : 'mt-3'}`}>
        <button
          onClick={onCancel}
          className={`rounded-xl border border-slate-200 bg-white font-medium text-slate-600 transition hover:bg-slate-50 ${isAdd ? 'px-4 py-2 text-sm shadow-sm' : 'px-3 py-1.5 text-xs'}`}
        >
          Cancel
        </button>
        <button
          onClick={onSubmit}
          disabled={!name.trim()}
          className={`rounded-xl bg-indigo-600 font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60 ${isAdd ? 'px-4 py-2 text-sm shadow-sm' : 'px-3 py-1.5 text-xs'}`}
        >
          {isAdd ? 'Add tag' : 'Save'}
        </button>
      </div>
    </div>
  )
}
