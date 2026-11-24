import type { LinkWithTags, LinkFilterParams } from '@/lib/services/links'

export function matchesLocalFilters(link: LinkWithTags, params: LinkFilterParams): boolean {
  if (params.statuses.length > 0 && !params.statuses.includes(link.status)) return false
  if (params.favoritesOnly && !link.is_favorite) return false
  if (params.categoryId && link.category_id !== params.categoryId) return false
  return true
}

/**
 * The dashboard's free-text rule: case-insensitive substring of the title, URL,
 * site name, notes or any tag name. An empty query matches everything.
 */
export function matchesTextSearch(link: LinkWithTags, query: string, tagNameById: Map<string, string>): boolean {
  const q = query.toLowerCase()
  if (!q) return true
  const tagNames = link.tags.map(id => tagNameById.get(id) ?? '')
  return !!(
    link.title?.toLowerCase().includes(q) ||
    link.url.toLowerCase().includes(q) ||
    link.site_name?.toLowerCase().includes(q) ||
    link.notes?.toLowerCase().includes(q) ||
    tagNames.some(name => name.toLowerCase().includes(q))
  )
}

/**
 * `#tag` tokens that name an existing tag (case-insensitive exact name) become tag
 * ids; a `#tag` that names no tag stays in the text as plain text, so it still
 * narrows results instead of silently clearing the filter. The query is trimmed.
 */
export function parseHashtagQuery(
  query: string,
  tags: ReadonlyArray<{ id: string; name: string }>,
): { textSearch: string; tagIds: string[] } {
  const tagIds: string[] = []
  const textSearch = query.trim()
    .replace(/#(\w+)/g, (match, name: string) => {
      const tag = tags.find(t => t.name.toLowerCase() === name.toLowerCase())
      if (!tag) return match
      if (!tagIds.includes(tag.id)) tagIds.push(tag.id)
      return ''
    })
    .trim()
  return { textSearch, tagIds }
}

/** What `parseHashtagQuery` returns. */
export type ParsedLinkQuery = { textSearch: string; tagIds: string[] }

/**
 * The dashboard's search rule on an already-parsed query: the link has any of the
 * `#tag` ids (when there are some) and matches the remaining text.
 */
export function matchesParsedQuery(
  link: LinkWithTags,
  { textSearch, tagIds }: ParsedLinkQuery,
  tagNameById: Map<string, string>,
): boolean {
  if (tagIds.length > 0 && !link.tags.some(id => tagIds.includes(id))) return false
  return matchesTextSearch(link, textSearch, tagNameById)
}
