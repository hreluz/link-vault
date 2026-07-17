"use client"

import { useEffect, useRef, useState } from "react"
import Picker from "@emoji-mart/react"
import data from "@emoji-mart/data"
import { useCategoriesContext } from "./CategoriesContext"
import { COLORS, colorFor as colorForCategory, ColorPicker } from "@/components/ColorPicker"
import CategoryDomainsModal from "./CategoryDomainsModal"

export { colorForCategory, COLORS as CATEGORY_COLORS }

interface Props {
  mode: 'add' | 'edit'
}

export default function CategoryForm({ mode }: Props) {
  const {
    categories,
    editingId,
    newIcon, setNewIcon, newName, setNewName, newColor, setNewColor, handleAdd, closeAdd, addError,
    addDomainsAfterCreate, setAddDomainsAfterCreate,
    editIcon, setEditIcon, editName, setEditName, editColor, setEditColor, handleSaveEdit, setEditingId, editError,
  } = useCategoriesContext()

  const [domainsOpen, setDomainsOpen] = useState(false)
  const editingCategory = mode === 'edit' ? (categories.find(c => c.id === editingId) ?? null) : null

  const isAdd = mode === 'add'
  const icon = isAdd ? newIcon : editIcon
  const onIconChange = isAdd ? setNewIcon : setEditIcon
  const name = isAdd ? newName : editName
  const onNameChange = isAdd ? setNewName : setEditName
  const color = isAdd ? newColor : editColor
  const onColorChange = isAdd ? setNewColor : setEditColor
  const onSubmit = isAdd ? handleAdd : handleSaveEdit
  const onCancel = isAdd ? closeAdd : () => setEditingId(null)
  const submitLabel = isAdd ? 'Add category' : 'Save'
  const title = isAdd ? 'New category' : undefined
  const error = isAdd ? addError : editError

  const [open, setOpen] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  return (
    <>
    <div className="mb-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
      {title && <p className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">{title}</p>}
      <div className="flex gap-3">
        <div className="relative" ref={pickerRef}>
          <button
            type="button"
            onClick={() => setOpen(v => !v)}
            className="flex h-full w-20 items-center justify-center rounded-xl border border-slate-200 bg-white text-2xl outline-none transition hover:bg-slate-50 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            {icon || "🔗"}
          </button>
          {open && (
            <div className="absolute left-0 top-full z-50 mt-1">
              <Picker
                data={data}
                onEmojiSelect={(e: { native: string }) => {
                  onIconChange(e.native)
                  setOpen(false)
                }}
                theme="light"
                previewPosition="none"
                skinTonePosition="none"
              />
            </div>
          )}
        </div>
        <input
          autoFocus
          type="text"
          placeholder="Category name"
          value={name}
          onChange={e => onNameChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onSubmit(); if (e.key === 'Escape') onCancel() }}
          className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
        />
      </div>
      <div className="mt-3">
        <ColorPicker selected={color} onChange={onColorChange} />
      </div>
      {isAdd && (
        <button
          type="button"
          onClick={() => setAddDomainsAfterCreate(v => !v)}
          className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          aria-label={addDomainsAfterCreate ? 'Disable adding domains after creating' : 'Enable adding domains after creating'}
        >
          <span className={addDomainsAfterCreate ? 'text-slate-600 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500'}>
            Add domains after creating
          </span>
          <span
            className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors ${
              addDomainsAfterCreate ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'
            }`}
          >
            <span
              className={`inline-block h-3 w-3 rounded-full bg-white shadow-sm transition-transform ${
                addDomainsAfterCreate ? 'translate-x-3.5' : 'translate-x-0.5'
              }`}
            />
          </span>
        </button>
      )}
      {error && (
        <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</p>
      )}
      <div className="mt-4 flex gap-2">
        <button
          onClick={onCancel}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
        >
          Cancel
        </button>
        <button
          onClick={onSubmit}
          disabled={!name.trim()}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitLabel}
        </button>
        {mode === 'edit' && editingCategory && (
          <button
            type="button"
            onClick={() => setDomainsOpen(true)}
            title="Manage domains"
            className="ml-auto rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
          >
            🌐 Domains
          </button>
        )}
      </div>
    </div>

    {domainsOpen && editingCategory && (
      <CategoryDomainsModal
        category={editingCategory}
        onClose={() => setDomainsOpen(false)}
      />
    )}
    </>
  )
}
