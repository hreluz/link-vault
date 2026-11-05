import { describe, it, expect, vi, beforeEach } from 'vitest'
import { deleteImportedLinks, removeUnusedImportCreations } from '@/lib/services/importExport/undoImport'

const { mockFrom, deleteCalls, selectCalls, deleteResult, selectResult } = vi.hoisted(() => {
  const deleteCalls: Array<{ table: string; ids: string[] }> = []
  const selectCalls: Array<{ table: string; column: string; ids: string[] }> = []
  // Overridable per test: what a delete / reference select on a table returns for a batch.
  const deleteResult = {
    fn: (_table: string, ids: string[]) => ({ data: ids.map(id => ({ id })), error: null as unknown }),
  }
  type SelectFn = (table: string, column: string, ids: string[]) => { data: Record<string, string>[]; error: unknown }
  const selectResult: { fn: SelectFn } = { fn: () => ({ data: [], error: null }) }
  const mockFrom = vi.fn((table: string) => ({
    delete: vi.fn(() => ({
      in: vi.fn((_col: string, ids: string[]) => ({
        select: vi.fn(async () => {
          deleteCalls.push({ table, ids })
          return deleteResult.fn(table, ids)
        }),
      })),
    })),
    select: vi.fn((column: string) => ({
      in: vi.fn(async (_col: string, ids: string[]) => {
        selectCalls.push({ table, column, ids })
        return selectResult.fn(table, column, ids)
      }),
    })),
  }))
  return { mockFrom, deleteCalls, selectCalls, deleteResult, selectResult }
})

vi.mock('@/lib/supabase/client', () => ({ createClient: vi.fn(() => ({ from: mockFrom })) }))

const ids = (n: number, prefix = 'l') => Array.from({ length: n }, (_, i) => `${prefix}${i}`)

beforeEach(() => {
  vi.clearAllMocks()
  deleteCalls.length = 0
  selectCalls.length = 0
  deleteResult.fn = (_table, batch) => ({ data: batch.map(id => ({ id })), error: null })
  selectResult.fn = () => ({ data: [], error: null })
})

describe('deleteImportedLinks', () => {
  it('hard-deletes the links in batches of 200 and returns the count', async () => {
    const result = await deleteImportedLinks(ids(450))

    expect(result).toBe(450)
    expect(deleteCalls.map(c => [c.table, c.ids.length])).toEqual([['links', 200], ['links', 200], ['links', 50]])
  })

  it('never filters on is_favorite, so favorites are deleted too', async () => {
    await deleteImportedLinks(['fav-1'])

    expect(deleteCalls).toEqual([{ table: 'links', ids: ['fav-1'] }])
  })

  it('counts only the rows the database returned', async () => {
    deleteResult.fn = () => ({ data: [{ id: 'l0' }], error: null })

    expect(await deleteImportedLinks(['l0', 'gone'])).toBe(1)
  })

  it('returns null and stops when a batch fails', async () => {
    deleteResult.fn = () => ({ data: null as never, error: { message: 'boom' } })

    expect(await deleteImportedLinks(ids(300))).toBeNull()
    expect(deleteCalls).toHaveLength(1)
  })

  it('returns 0 without a request for no ids', async () => {
    expect(await deleteImportedLinks([])).toBe(0)
    expect(mockFrom).not.toHaveBeenCalled()
  })
})

describe('removeUnusedImportCreations', () => {
  it('deletes only the created tags and categories no link references', async () => {
    selectResult.fn = (table, column) => table === 'link_tags'
      ? { data: [{ [column]: 't-used' }], error: null }
      : { data: [{ [column]: 'c-used' }], error: null }

    const result = await removeUnusedImportCreations({
      tagIds: ['t-used', 't-free'], categoryIds: ['c-used', 'c-free'],
    })

    expect(result).toEqual({ tags: 1, categories: 1 })
    expect(deleteCalls).toEqual(expect.arrayContaining([
      { table: 'tags', ids: ['t-free'] },
      { table: 'categories', ids: ['c-free'] },
    ]))
    expect(deleteCalls).toHaveLength(2)
  })

  it('checks references without a deleted_at filter, so links in Trash count as using them', async () => {
    await removeUnusedImportCreations({ tagIds: ['t1'], categoryIds: ['c1'] })

    expect(selectCalls).toEqual(expect.arrayContaining([
      { table: 'link_tags', column: 'tag_id', ids: ['t1'] },
      { table: 'links', column: 'category_id', ids: ['c1'] },
    ]))
  })

  it('makes no request when nothing was created', async () => {
    expect(await removeUnusedImportCreations({ tagIds: [], categoryIds: [] })).toEqual({ tags: 0, categories: 0 })
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('returns null and deletes nothing when a reference check fails', async () => {
    selectResult.fn = () => ({ data: null as never, error: { message: 'boom' } })

    expect(await removeUnusedImportCreations({ tagIds: ['t1'], categoryIds: [] })).toBeNull()
    expect(deleteCalls).toHaveLength(0)
  })

  it('returns null when a delete fails', async () => {
    deleteResult.fn = () => ({ data: null as never, error: { message: 'boom' } })

    expect(await removeUnusedImportCreations({ tagIds: ['t1'], categoryIds: [] })).toBeNull()
  })

  it('checks references in batches of 200', async () => {
    await removeUnusedImportCreations({ tagIds: ids(250, 't'), categoryIds: [] })

    expect(selectCalls.map(c => c.ids.length)).toEqual([200, 50])
  })
})
