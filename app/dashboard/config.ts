import type { ContentType, LinkStatus } from '@/lib/types/database'

export const CONTENT_TYPE_CONFIG: Record<ContentType, { label: string; icon: string; badge: string }> = {
  youtube:   { label: 'YouTube',   icon: '📺', badge: 'bg-red-100 text-red-700' },
  instagram: { label: 'Instagram', icon: '📸', badge: 'bg-pink-100 text-pink-700' },
  tiktok:    { label: 'TikTok',    icon: '🎵', badge: 'bg-purple-100 text-purple-700' },
  article:   { label: 'Article',   icon: '📄', badge: 'bg-blue-100 text-blue-700' },
  course:    { label: 'Course',    icon: '🎓', badge: 'bg-green-100 text-green-700' },
  tweet:     { label: 'Tweet',     icon: '🐦', badge: 'bg-sky-100 text-sky-700' },
  github:    { label: 'GitHub',    icon: '💻', badge: 'bg-slate-100 text-slate-700' },
  other:     { label: 'Other',     icon: '🔗', badge: 'bg-slate-100 text-slate-500' },
}

export const STATUS_CONFIG: Record<LinkStatus, { label: string; badge: string }> = {
  unread:   { label: 'Unread',    badge: 'bg-slate-100 text-slate-600' },
  watching: { label: 'Watching',  badge: 'bg-indigo-100 text-indigo-700' },
  read:     { label: 'Read',      badge: 'bg-emerald-100 text-emerald-700' },
  favorite: { label: 'Favorite',  badge: 'bg-amber-100 text-amber-700' },
  archived: { label: 'Archived',  badge: 'bg-slate-100 text-slate-400' },
}

export const CONTENT_TYPE_FILTERS = [
  { label: 'All',       value: 'all' as const },
  { label: '📺 YouTube',   value: 'youtube' as ContentType },
  { label: '📄 Articles',  value: 'article' as ContentType },
  { label: '💻 GitHub',    value: 'github' as ContentType },
  { label: '🎓 Courses',   value: 'course' as ContentType },
  { label: '🐦 Tweets',    value: 'tweet' as ContentType },
  { label: '📸 Instagram', value: 'instagram' as ContentType },
  { label: '🎵 TikTok',    value: 'tiktok' as ContentType },
  { label: '🔗 Other',     value: 'other' as ContentType },
]
