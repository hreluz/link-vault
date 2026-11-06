import type { LinkStatus } from '@/lib/types/database'

export const STATUS_CONFIG: Record<LinkStatus, { label: string; badge: string }> = {
  unread:   { label: 'Unread',   badge: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
  watching: { label: 'Watching', badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' },
  read:     { label: 'Read',     badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  archived: { label: 'Archived', badge: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' },
}

export const STATUS_ORDER: Record<LinkStatus, number> = {
  unread: 0, watching: 1, read: 2, archived: 3,
}

