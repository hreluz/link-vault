import type { LinkWithTags, LinkFilterParams } from '@/lib/services/links'

export function matchesLocalFilters(link: LinkWithTags, params: LinkFilterParams): boolean {
  if (params.statuses.length > 0 && !params.statuses.includes(link.status)) return false
  if (params.favoritesOnly && !link.is_favorite) return false
  if (params.categoryId && link.category_id !== params.categoryId) return false
  return true
}
