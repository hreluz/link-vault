'use client'

export const COLORS = [
  { value: 'indigo',  bg: 'bg-indigo-100',  text: 'text-indigo-700',  dot: 'bg-indigo-500'  },
  { value: 'emerald', bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  { value: 'amber',   bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-500'   },
  { value: 'rose',    bg: 'bg-rose-100',    text: 'text-rose-700',    dot: 'bg-rose-500'    },
  { value: 'sky',     bg: 'bg-sky-100',     text: 'text-sky-700',     dot: 'bg-sky-500'     },
  { value: 'purple',  bg: 'bg-purple-100',  text: 'text-purple-700',  dot: 'bg-purple-500'  },
  { value: 'pink',    bg: 'bg-pink-100',    text: 'text-pink-700',    dot: 'bg-pink-500'    },
  { value: 'slate',   bg: 'bg-slate-100',   text: 'text-slate-600',   dot: 'bg-slate-400'   },
]

export function colorFor(value: string | null | undefined) {
  return COLORS.find(c => c.value === value) ?? COLORS[0]
}

export function ColorPicker({ selected, onChange }: { selected: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500 dark:text-slate-400">Color</span>
      {COLORS.map(c => (
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
