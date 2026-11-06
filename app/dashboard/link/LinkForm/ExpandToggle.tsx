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
      aria-expanded={expanded}
      // 44px hit area; the negative margin keeps the form spacing unchanged.
      className="focus-ring -my-3 flex min-h-11 items-center gap-1 self-start rounded-lg text-sm font-medium text-primary-600 hover:text-primary-500 transition"
    >
      <svg
        aria-hidden="true"
        className={`h-4 w-4 transition-transform duration-200 motion-reduce:transition-none ${expanded ? 'rotate-180' : ''}`}
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
      {expanded ? 'Fewer options' : 'More options'}
    </button>
  )
}
