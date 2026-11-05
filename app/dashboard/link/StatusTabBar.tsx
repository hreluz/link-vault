'use client'

import { STATUS_CONFIG } from '../config'
import type { LinkStatus } from '@/lib/types/database'
import { useLinkListContext } from './LinkListContext'

interface Props {
  value: LinkStatus | null
  onChange: (status: LinkStatus | null) => void
}

export function StatusTabBar({ value, onChange }: Props) {
  const statuses = Object.keys(STATUS_CONFIG) as LinkStatus[]

  return (
    <div className="mb-3 -mx-4 -mt-1 flex gap-2 overflow-x-auto px-4 py-1 scrollbar-none">
      <button
        onClick={() => onChange(null)}
        aria-pressed={value === null}
        className={`focus-ring inline-flex min-h-11 shrink-0 items-center rounded-full px-4 py-1.5 text-sm font-medium transition sm:min-h-9 ${
          value === null
            ? 'bg-primary-600 text-white'
            : 'bg-surface-100 text-surface-600 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-400 dark:hover:bg-surface-700'
        }`}
      >
        All
      </button>
      {statuses.map(s => (
        <button
          key={s}
          onClick={() => onChange(value === s ? null : s)}
          aria-pressed={value === s}
          className={`focus-ring inline-flex min-h-11 shrink-0 items-center rounded-full px-4 py-1.5 text-sm font-medium transition sm:min-h-9 ${
            value === s
              ? STATUS_CONFIG[s].badge
              : 'bg-surface-100 text-surface-600 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-400 dark:hover:bg-surface-700'
          }`}
        >
          {STATUS_CONFIG[s].label}
        </button>
      ))}
    </div>
  )
}

export default function ConnectedStatusTabBar() {
  const { selectedStatuses, setSelectedStatuses } = useLinkListContext()
  return (
    <StatusTabBar
      value={selectedStatuses[0] ?? null}
      onChange={s => setSelectedStatuses(s ? [s] : [])}
    />
  )
}
