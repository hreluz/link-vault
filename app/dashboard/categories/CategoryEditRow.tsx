interface Props {
  icon: string
  onIconChange: (v: string) => void
  name: string
  onNameChange: (v: string) => void
  onSave: () => void
  onCancel: () => void
}

export default function CategoryEditRow({ icon, onIconChange, name, onNameChange, onSave, onCancel }: Props) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-indigo-200">
      <div className="flex gap-3">
        <input
          type="text"
          value={icon}
          onChange={e => onIconChange(e.target.value)}
          className="w-20 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-center text-lg outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
        />
        <input
          autoFocus
          type="text"
          value={name}
          onChange={e => onNameChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onSave(); if (e.key === 'Escape') onCancel() }}
          className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={onCancel}
          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          disabled={!name.trim()}
          className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
        >
          Save
        </button>
      </div>
    </div>
  )
}
