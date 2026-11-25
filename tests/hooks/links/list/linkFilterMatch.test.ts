import { describe, it, expect } from 'vitest'
import { matchesParsedQuery, matchesTextSearch, parseHashtagQuery } from '@/lib/hooks/links/list/linkFilterMatch'
import type { LinkWithTags } from '@/lib/services/links'

const link = {
  id: 'l1', url: 'https://example.com/post', title: 'Async Rust', site_name: 'example.com',
  notes: 'read later', tags: ['t-rust'],
} as unknown as LinkWithTags
const tagNameById = new Map([['t-rust', 'rust'], ['t-go', 'golang']])

describe('matchesTextSearch', () => {
  it.each([
    ['title', 'async'],
    ['url', '/post'],
    ['site name', 'example.com'],
    ['notes', 'LATER'],
    ['tag name', 'rus'],
  ])('matches on %s', (_field, query) => {
    expect(matchesTextSearch(link, query, tagNameById)).toBe(true)
  })

  it('misses when nothing contains the query', () => {
    expect(matchesTextSearch(link, 'python', tagNameById)).toBe(false)
  })

  it('matches everything for an empty query', () => {
    expect(matchesTextSearch(link, '', tagNameById)).toBe(true)
  })

  it('treats a missing title/notes as no match', () => {
    const bare = { ...link, title: null, notes: null, site_name: null, tags: [] } as LinkWithTags
    expect(matchesTextSearch(bare, 'async', tagNameById)).toBe(false)
  })
})

describe('parseHashtagQuery', () => {
  const tags = [{ id: 't-rust', name: 'rust' }, { id: 't-go', name: 'golang' }]

  it('turns a known #tag into a tag id', () => {
    expect(parseHashtagQuery('#Rust', tags)).toEqual({ textSearch: '', tagIds: ['t-rust'] })
  })

  it('keeps an unknown #tag as plain text', () => {
    expect(parseHashtagQuery('#nosuchtag', tags)).toEqual({ textSearch: '#nosuchtag', tagIds: [] })
  })

  it('splits mixed #tag and text', () => {
    expect(parseHashtagQuery('  #rust async  ', tags)).toEqual({ textSearch: 'async', tagIds: ['t-rust'] })
  })

  it('collects several tags once each', () => {
    expect(parseHashtagQuery('#rust #golang #rust', tags).tagIds).toEqual(['t-rust', 't-go'])
  })
})

describe('matchesParsedQuery', () => {
  const goLink = { ...link, id: 'l2', title: 'Go channels', notes: null, tags: ['t-go'] } as LinkWithTags

  it('tag-only: keeps links with any of the tags', () => {
    const q = { textSearch: '', tagIds: ['t-rust'] }
    expect(matchesParsedQuery(link, q, tagNameById)).toBe(true)
    expect(matchesParsedQuery(goLink, q, tagNameById)).toBe(false)
    expect(matchesParsedQuery(goLink, { textSearch: '', tagIds: ['t-rust', 't-go'] }, tagNameById)).toBe(true)
  })

  it('text-only: uses the text rule', () => {
    const q = { textSearch: 'channels', tagIds: [] }
    expect(matchesParsedQuery(goLink, q, tagNameById)).toBe(true)
    expect(matchesParsedQuery(link, q, tagNameById)).toBe(false)
  })

  it('both: needs the tag and the text', () => {
    expect(matchesParsedQuery(link, { textSearch: 'async', tagIds: ['t-rust'] }, tagNameById)).toBe(true)
    expect(matchesParsedQuery(link, { textSearch: 'channels', tagIds: ['t-rust'] }, tagNameById)).toBe(false)
  })

  it('no tag ids and no text: matches everything', () => {
    expect(matchesParsedQuery(goLink, { textSearch: '', tagIds: [] }, tagNameById)).toBe(true)
  })
})
