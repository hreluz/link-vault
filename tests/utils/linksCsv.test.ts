import { describe, it, expect } from 'vitest'
import { linksToCSV, parseCSV } from '@/lib/utils/linksCsv'
import type { ExportedLink } from '@/lib/types/importExport'

const LINK: ExportedLink = {
  url: 'https://example.com', title: 'Example',
  description: null, site_name: 'example.com', image_url: null, duration: null,
  status: 'unread', is_favorite: false, notes: null,
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
  category: 'Article', tags: ['tag-1', 'tag-2'],
}

const HEADER = 'url,title,description,site_name,image_url,duration,category,status,is_favorite,notes,tags,created_at,updated_at'

describe('linksToCSV', () => {
  it('includes the header row', () => {
    expect(linksToCSV([])).toBe(HEADER)
  })

  it('writes the category name column as-is', () => {
    const csv = linksToCSV([LINK])
    expect(csv.split('\n')[1]).toContain('Article')
  })

  it('leaves the category column blank when there is no category', () => {
    const csv = linksToCSV([{ ...LINK, category: null }])
    const cols = csv.split('\n')[1].split(',')
    expect(cols[6]).toBe('')
  })

  it('writes tag names joined with |', () => {
    const csv = linksToCSV([{ ...LINK, tags: ['react', 'typescript'] }])
    expect(csv.split('\n')[1]).toContain('react|typescript')
  })

  it('quotes fields containing commas', () => {
    const csv = linksToCSV([{ ...LINK, title: 'Title, with a comma' }])
    expect(csv.split('\n')[1]).toContain('"Title, with a comma"')
  })

  it('escapes embedded quotes by doubling them', () => {
    const csv = linksToCSV([{ ...LINK, title: 'A "quoted" title' }])
    expect(csv.split('\n')[1]).toContain('"A ""quoted"" title"')
  })

  it('writes is_favorite as a literal true/false string', () => {
    const csv = linksToCSV([{ ...LINK, is_favorite: true }])
    expect(csv.split('\n')[1].split(',')).toContain('true')
  })

  it('includes description, image_url, duration, and updated_at columns', () => {
    const csv = linksToCSV([{
      ...LINK, description: 'A desc', image_url: 'https://img.example/x.png', duration: '4:33',
    }])
    const cols = csv.split('\n')[1].split(',')
    expect(cols).toEqual([
      'https://example.com', 'Example', 'A desc', 'example.com', 'https://img.example/x.png', '4:33',
      'Article', 'unread', 'false', '', 'tag-1|tag-2', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z',
    ])
  })
})

describe('parseCSV', () => {
  it('returns an empty array when there is no data row', () => {
    expect(parseCSV(HEADER)).toEqual([])
  })

  it('returns an empty array when the url column is missing', () => {
    const csv = ['title,site_name', 'Example,example.com'].join('\n')
    expect(parseCSV(csv)).toEqual([])
  })

  it('parses a basic row into a ParsedRow', () => {
    const csv = [
      HEADER,
      'https://example.com,Example,A desc,example.com,,4:33,Article,read,true,a note,react|ts,2026-01-01,2026-01-02',
    ].join('\n')
    const [row] = parseCSV(csv)

    expect(row).toEqual({
      url: 'https://example.com',
      title: 'Example',
      description: 'A desc',
      site_name: 'example.com',
      image_url: null,
      duration: '4:33',
      notes: 'a note',
      tags: ['react', 'ts'],
      categoryName: 'Article',
      status: 'read',
      is_favorite: true,
      created_at: '2026-01-01',
      updated_at: '2026-01-02',
    })
  })

  it('correctly parses a quoted title field that contains commas', () => {
    const csv = [
      HEADER,
      'https://example.com,"Title with, a, comma",,example.com,,,Article,unread,false,,react,2026-01-01,2026-01-01',
    ].join('\n')
    const [row] = parseCSV(csv)

    expect(row.title).toBe('Title with, a, comma')
    expect(row.categoryName).toBe('Article')
  })

  it('unescapes doubled quotes inside a quoted field', () => {
    const csv = [
      HEADER,
      'https://example.com,"A ""quoted"" title",,example.com,,,,unread,false,,,2026-01-01,2026-01-01',
    ].join('\n')
    const [row] = parseCSV(csv)

    expect(row.title).toBe('A "quoted" title')
  })

  it('leaves categoryName undefined when the category column is blank', () => {
    const csv = [HEADER, 'https://example.com,,,,,,,,false,,,2026-01-01,2026-01-01'].join('\n')
    const [row] = parseCSV(csv)

    expect(row.categoryName).toBeUndefined()
  })

  it('drops rows with a blank url', () => {
    const csv = [HEADER, ',Example,,example.com,,,,,false,,,2026-01-01,2026-01-01'].join('\n')
    expect(parseCSV(csv)).toEqual([])
  })

  it('splits the tags column on | and filters out empty entries', () => {
    const csv = [HEADER, 'https://example.com,,,,,,,,,,react||ts,,'].join('\n')
    const [row] = parseCSV(csv)

    expect(row.tags).toEqual(['react', 'ts'])
  })

  it('ignores an invalid status value', () => {
    const csv = [HEADER, 'https://example.com,,,,,,,not-a-status,false,,,2026-01-01,2026-01-01'].join('\n')
    const [row] = parseCSV(csv)

    expect(row.status).toBeUndefined()
  })

  it('leaves created_at undefined when the column is blank', () => {
    const csv = [HEADER, 'https://example.com,,,,,,,,false,,,,'].join('\n')
    const [row] = parseCSV(csv)

    expect(row.created_at).toBeUndefined()
  })

  it('parses updated_at when given, and leaves it undefined when the column is blank', () => {
    const withValue = [HEADER, 'https://example.com,,,,,,,,false,,,,2026-01-02'].join('\n')
    expect(parseCSV(withValue)[0].updated_at).toBe('2026-01-02')

    const blank = [HEADER, 'https://example.com,,,,,,,,false,,,,'].join('\n')
    expect(parseCSV(blank)[0].updated_at).toBeUndefined()
  })
})
