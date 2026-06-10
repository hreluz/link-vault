import type { LinkStatus } from '@/lib/types/database'

export const STATUS_CONFIG: Record<LinkStatus, { label: string; badge: string }> = {
  unread:   { label: 'Unread',   badge: 'bg-slate-100 text-slate-600' },
  watching: { label: 'Watching', badge: 'bg-indigo-100 text-indigo-700' },
  read:     { label: 'Read',     badge: 'bg-emerald-100 text-emerald-700' },
  archived: { label: 'Archived', badge: 'bg-slate-100 text-slate-400' },
}

export const STATUS_ORDER: Record<LinkStatus, number> = {
  unread: 0, watching: 1, read: 2, archived: 3,
}

