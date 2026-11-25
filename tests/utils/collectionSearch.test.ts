import { describe, it, expect } from 'vitest'
import { descriptionMatches, filterCollectionsByName, filterCollectionsByText, findCollectionByName } from '@/lib/utils/collectionSearch'

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

describe('filterCollectionsByText', () => {
  const described = [
    { id: '1', name: 'Learn Rust', description: 'Ownership and lifetimes' },
    { id: '2', name: 'Weekend', description: null },
    { id: '3', name: 'Go basics', description: 'Goroutines, channels' },
  ]

  it('matches on the name', () => {
    expect(filterCollectionsByText(described, 'week').map(i => i.id)).toEqual(['2'])
  })

  it('matches on the description', () => {
    expect(filterCollectionsByText(described, 'lifetimes').map(i => i.id)).toEqual(['1'])
  })

  it('skips a null description without throwing', () => {
    expect(filterCollectionsByText(described, 'channels').map(i => i.id)).toEqual(['3'])
  })

  it('is case-insensitive and trims the query', () => {
    expect(filterCollectionsByText(described, '  OWNERSHIP ').map(i => i.id)).toEqual(['1'])
  })

  it('returns every item for an empty query', () => {
    expect(filterCollectionsByText(described, '   ')).toEqual(described)
  })

  it('keeps the given order', () => {
    expect(filterCollectionsByText([...described].reverse(), 'o').map(i => i.id)).toEqual(['3', '1'])
  })
})

describe('descriptionMatches', () => {
  it('is true only when the description contains the trimmed query', () => {
    expect(descriptionMatches('Ownership and lifetimes', ' LIFE ')).toBe(true)
    expect(descriptionMatches('Ownership and lifetimes', 'rust')).toBe(false)
  })

  it('is false for a null description or an empty query', () => {
    expect(descriptionMatches(null, 'rust')).toBe(false)
    expect(descriptionMatches('Ownership', '  ')).toBe(false)
  })
})
