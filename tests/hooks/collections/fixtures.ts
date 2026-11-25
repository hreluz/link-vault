import type { LinkWithTags } from '@/lib/services/links'
import type { CollectionLinkRow } from '@/lib/hooks/collections/useCollectionLinks'
import type { Collection } from '@/lib/services/collections'

export function makeLink(id: string, overrides: Partial<LinkWithTags> = {}): LinkWithTags {
  return {
    id, user_id: 'u1', url: `https://example.com/${id}`, title: `Link ${id}`, description: null,
    site_name: 'example.com', image_url: null, duration: null, notes: null, category_id: null,
    status: 'unread', is_favorite: false, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    deleted_at: null, moved_to_end_at: null, tags: [],
    ...overrides,
  }
}

export function makeRow(id: string, position: number, overrides: Partial<LinkWithTags> = {}): CollectionLinkRow {
  return {
    membership: { collection_id: 'c1', link_id: id, position, added_at: `2026-01-01T00:00:0${position % 10}Z` },
    link: makeLink(id, overrides),
  }
}

export const COLLECTION: Collection = {
  id: 'c1', user_id: 'u1', name: 'Learn Rust', emoji: '🎓', description: null,
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
}
