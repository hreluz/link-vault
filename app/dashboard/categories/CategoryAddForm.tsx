interface Props {
  icon: string
  onIconChange: (v: string) => void
  name: string
  onNameChange: (v: string) => void
  onAdd: () => void
  onCancel: () => void
  error?: string | null
}

export default function CategoryAddForm({ icon, onIconChange, name, onNameChange, onAdd, onCancel, error }: Props) {
  return (
    <div className="mb-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <p className="mb-3 text-sm font-semibold text-slate-700">New category</p>
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Icon"
          value={icon}
          onChange={e => onIconChange(e.target.value)}
          className="w-20 rounded-xl border border-slate-200 bg-white px-3 py-3 text-center text-lg outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
        />
        <input
          autoFocus
          type="text"
          placeholder="Category name"
          value={name}
          onChange={e => onNameChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onAdd(); if (e.key === 'Escape') onCancel() }}
          className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
        />
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
          onClick={onAdd}
          disabled={!name.trim()}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Add category
        </button>
      </div>
    </div>
  )
}
