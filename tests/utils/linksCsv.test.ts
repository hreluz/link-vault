import { describe, it, expect } from 'vitest'
import { linksToCSV, parseCSV } from '@/lib/utils/linksCsv'
import type { LinkWithTags } from '@/lib/services/links'

const LINK: LinkWithTags = {
  id: '1', user_id: 'u1', url: 'https://example.com', title: 'Example',
  description: null, site_name: 'example.com', category_id: 'cat-1',
  status: 'unread', is_favorite: false, notes: null, image_url: null, duration: null,
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', deleted_at: null,
  tags: ['tag-1', 'tag-2'],
}

describe('linksToCSV', () => {
  it('includes the header row', () => {
    const csv = linksToCSV([], new Map(), new Map())
    expect(csv).toBe('url,title,site_name,category,status,is_favorite,notes,tags,created_at')
  })

  it('resolves category_id to a category name via the map', () => {
    const csv = linksToCSV([LINK], new Map([['cat-1', 'Article']]), new Map())
    expect(csv.split('\n')[1]).toContain('Article')
  })

  it('leaves the category column blank when category_id has no match', () => {
    const csv = linksToCSV([LINK], new Map(), new Map())
    const cols = csv.split('\n')[1].split(',')
    expect(cols[3]).toBe('')
  })

  it('resolves tag ids to names and joins them with |', () => {
    const tagNameById = new Map([['tag-1', 'react'], ['tag-2', 'typescript']])
    const csv = linksToCSV([LINK], new Map(), tagNameById)
    expect(csv.split('\n')[1]).toContain('react|typescript')
  })

  it('quotes fields containing commas', () => {
    const link = { ...LINK, title: 'Title, with a comma' }
    const csv = linksToCSV([link], new Map(), new Map())
    expect(csv.split('\n')[1]).toContain('"Title, with a comma"')
  })

  it('escapes embedded quotes by doubling them', () => {
    const link = { ...LINK, title: 'A "quoted" title' }
    const csv = linksToCSV([link], new Map(), new Map())
    expect(csv.split('\n')[1]).toContain('"A ""quoted"" title"')
  })

  it('writes is_favorite as a literal true/false string', () => {
    const csv = linksToCSV([{ ...LINK, is_favorite: true }], new Map(), new Map())
    expect(csv.split('\n')[1].split(',')).toContain('true')
  })
})

describe('parseCSV', () => {
  const HEADER = 'url,title,site_name,category,status,is_favorite,notes,tags,created_at'

  it('returns an empty array when there is no data row', () => {
    expect(parseCSV(HEADER)).toEqual([])
  })

  it('returns an empty array when the url column is missing', () => {
    const csv = ['title,site_name', 'Example,example.com'].join('\n')
    expect(parseCSV(csv)).toEqual([])
  })

  it('parses a basic row into a ParsedRow', () => {
    const csv = [HEADER, 'https://example.com,Example,example.com,Article,unread,false,a note,react|ts,2026-01-01'].join('\n')
    const [row] = parseCSV(csv)

    expect(row).toEqual({
      url: 'https://example.com',
      title: 'Example',
      notes: 'a note',
      tags: ['react', 'ts'],
      categoryName: 'Article',
    })
  })

  it('correctly parses a quoted title field that contains commas', () => {
    const csv = [HEADER, 'https://example.com,"Title with, a, comma",example.com,Article,unread,false,,react,2026-01-01'].join('\n')
    const [row] = parseCSV(csv)

    expect(row.title).toBe('Title with, a, comma')
    expect(row.categoryName).toBe('Article')
  })

  it('unescapes doubled quotes inside a quoted field', () => {
    const csv = [HEADER, 'https://example.com,"A ""quoted"" title",example.com,,unread,false,,,2026-01-01'].join('\n')
    const [row] = parseCSV(csv)

    expect(row.title).toBe('A "quoted" title')
  })

  it('leaves categoryName undefined when the category column is blank', () => {
    const csv = [HEADER, 'https://example.com,,,,,false,,,2026-01-01'].join('\n')
    const [row] = parseCSV(csv)

    expect(row.categoryName).toBeUndefined()
  })

  it('drops rows with a blank url', () => {
    const csv = [HEADER, ',Example,example.com,,,false,,,2026-01-01'].join('\n')
    expect(parseCSV(csv)).toEqual([])
  })

  it('splits the tags column on | and filters out empty entries', () => {
    const csv = [HEADER, 'https://example.com,,,,,,,react||ts,'].join('\n')
    const [row] = parseCSV(csv)

    expect(row.tags).toEqual(['react', 'ts'])
  })
})
