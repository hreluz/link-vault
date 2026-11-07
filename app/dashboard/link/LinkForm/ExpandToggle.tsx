'use client'

import { ChevronDownIcon } from '@/components/icons'

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
      <ChevronDownIcon className={`h-4 w-4 transition-transform duration-200 motion-reduce:transition-none ${expanded ? 'rotate-180' : ''}`} />
      {expanded ? 'Fewer options' : 'More options'}
    </button>
  )
}
