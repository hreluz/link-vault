"use client"

import { useEffect, useRef, useState } from "react"
import Picker from "@emoji-mart/react"
import data from "@emoji-mart/data"
import { useCategoriesContext } from "./CategoriesContext"

export const CATEGORY_COLORS = [
  { value: 'indigo',  bg: 'bg-indigo-100',  text: 'text-indigo-700',  dot: 'bg-indigo-500'  },
  { value: 'emerald', bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  { value: 'amber',   bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-500'   },
  { value: 'rose',    bg: 'bg-rose-100',    text: 'text-rose-700',    dot: 'bg-rose-500'    },
  { value: 'sky',     bg: 'bg-sky-100',     text: 'text-sky-700',     dot: 'bg-sky-500'     },
  { value: 'purple',  bg: 'bg-purple-100',  text: 'text-purple-700',  dot: 'bg-purple-500'  },
  { value: 'pink',    bg: 'bg-pink-100',    text: 'text-pink-700',    dot: 'bg-pink-500'    },
  { value: 'slate',   bg: 'bg-slate-100',   text: 'text-slate-600',   dot: 'bg-slate-400'   },
]

export function colorForCategory(value: string | null | undefined) {
  return CATEGORY_COLORS.find(c => c.value === value) ?? CATEGORY_COLORS[0]
}

function ColorPicker({ selected, onChange }: { selected: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500">Color</span>
      {CATEGORY_COLORS.map(c => (
        <button
          key={c.value}
          type="button"
          onClick={() => onChange(c.value)}
          aria-label={c.value}
          className={`h-5 w-5 rounded-full transition ${c.dot} ring-offset-2 ${
            selected === c.value ? 'ring-2 ring-indigo-500 scale-110' : 'hover:scale-110'
          }`}
        />
      ))}
    </div>
  )
}

interface Props {
  mode: 'add' | 'edit'
}

export default function CategoryForm({ mode }: Props) {
  const {
    newIcon, setNewIcon, newName, setNewName, newColor, setNewColor, handleAdd, closeAdd, addError,
    editIcon, setEditIcon, editName, setEditName, editColor, setEditColor, handleSaveEdit, setEditingId, editError,
  } = useCategoriesContext()

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
    <div className="mb-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      {title && <p className="mb-3 text-sm font-semibold text-slate-700">{title}</p>}
      <div className="flex gap-3">
        <div className="relative" ref={pickerRef}>
          <button
            type="button"
            onClick={() => setOpen(v => !v)}
            className="flex h-full w-20 items-center justify-center rounded-xl border border-slate-200 bg-white text-2xl outline-none transition hover:bg-slate-50 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
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
          className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>
      <div className="mt-3">
        <ColorPicker selected={color} onChange={onColorChange} />
      </div>
      {error && (
        <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
      )}
      <div className="mt-4 flex gap-2">
        <button
          onClick={onCancel}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
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
      </div>
    </div>
  )
}
