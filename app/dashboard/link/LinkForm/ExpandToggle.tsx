'use client'

interface Props {
  expanded: boolean
  onToggle: () => void
}

export default function ExpandToggle({ expanded, onToggle }: Props) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-500 transition"
    >
      <svg
        className={`h-4 w-4 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
      {expanded ? 'Fewer options' : 'More options'}
    </button>
  )
}
