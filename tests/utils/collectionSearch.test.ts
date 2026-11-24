import { describe, it, expect } from 'vitest'
import { filterCollectionsByName, findCollectionByName } from '@/lib/utils/collectionSearch'

const items = [
  { id: '1', name: 'Learn Rust' },
  { id: '2', name: 'Rust videos' },
  { id: '3', name: 'Go basics' },
  { id: '4', name: 'Learn Rust' },
]

describe('filterCollectionsByName', () => {
  it('matches a substring', () => {
    expect(filterCollectionsByName(items, 'vid').map(i => i.id)).toEqual(['2'])
  })

  it('is case-insensitive', () => {
    expect(filterCollectionsByName(items, 'RUST').map(i => i.id)).toEqual(['1', '2', '4'])
  })

  it('trims the query', () => {
    expect(filterCollectionsByName(items, '  go  ').map(i => i.id)).toEqual(['3'])
  })

  it('keeps the given order', () => {
    expect(filterCollectionsByName([...items].reverse(), 'rust').map(i => i.id)).toEqual(['4', '2', '1'])
  })

  it('matches nothing for an empty query', () => {
    expect(filterCollectionsByName(items, '   ')).toEqual([])
  })

  it('returns nothing on a miss', () => {
    expect(filterCollectionsByName(items, 'python')).toEqual([])
  })
})

describe('findCollectionByName', () => {
  it('finds an exact match, case-insensitive and trimmed', () => {
    expect(findCollectionByName(items, '  go BASICS ')?.id).toBe('3')
  })

  it('returns the first of several same-named items', () => {
    expect(findCollectionByName(items, 'learn rust')?.id).toBe('1')
  })

  it('does not match a substring', () => {
    expect(findCollectionByName(items, 'learn rus')).toBeUndefined()
  })

  it('returns undefined on a miss or empty name', () => {
    expect(findCollectionByName(items, 'python')).toBeUndefined()
    expect(findCollectionByName(items, ' ')).toBeUndefined()
  })
})
