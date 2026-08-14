'use client'

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder: string
}

export default function ListSearchInput({ value, onChange, placeholder }: Props) {
  return (
    <div className="relative mb-4">
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-surface-400" aria-hidden="true">
        🔍
      </span>
      <input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-xl border border-surface-200 bg-surface-card py-3 pl-11 pr-4 text-sm text-surface-900 placeholder-surface-400 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100 dark:placeholder-surface-500"
      />
    </div>
  )
}
