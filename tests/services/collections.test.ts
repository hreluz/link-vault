import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { generateDek, encryptJson, decryptJson } from '@/lib/crypto/vault'
import {
  getCollections, getCollection, createCollection, updateCollection, deleteCollection,
  getCollectionMemberships, getCollectionIdsForLink, addLinksToCollection, removeLinkFromCollection,
  restoreMembership, swapCollectionLinkPositions, setLinkCollections, createPendingCollections,
  getCollectionCounts, countCollectionLinks, compareMemberships, formatCollectionCount,
  getMembershipsForLinks,
} from '@/lib/services/collections'

// A chainable query-builder mock: every method records its call and returns the
// chain; awaiting it resolves with the next queued result for that table.
type Result = { data?: unknown; error?: unknown }
const { state } = vi.hoisted(() => ({
  state: {
    queues: {} as Record<string, Result[]>,
    calls: [] as Array<{ table: string; method: string; args: unknown[] }>,
    rpc: vi.fn(),
    user: { id: 'u1' } as { id: string } | null,
  },
}))

function chain(table: string) {
  const target: Record<string, unknown> = {}
  const proxy: unknown = new Proxy(target, {
    get(_t, prop: string) {
      if (prop === 'then') {
        const next = state.queues[table]?.shift() ?? { data: null, error: null }
        return (resolve: (r: Result) => void) => resolve({ data: next.data ?? null, error: next.error ?? null })
      }
      return (...args: unknown[]) => {
        state.calls.push({ table, method: prop, args })
        return proxy
      }
    },
  })
  return proxy
}

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: vi.fn(async () => ({ data: { user: state.user } })) },
    from: vi.fn((table: string) => chain(table)),
    rpc: state.rpc,
  })),
}))

function queue(table: string, ...results: Result[]) {
  state.queues[table] = [...(state.queues[table] ?? []), ...results]
}
function callsOf(table: string, method?: string) {
  return state.calls.filter(c => c.table === table && (!method || c.method === method))
}

let dek: CryptoKey
beforeAll(async () => { dek = await generateDek() })
beforeEach(() => {
  state.queues = {}
  state.calls = []
  state.rpc.mockReset()
  state.user = { id: 'u1' }
})

async function encryptedRow(id: string, content: object, updated_at = '2026-01-01T00:00:00Z') {
  const { ciphertext, iv } = await encryptJson(content, dek)
  return { id, user_id: 'u1', enc_payload: ciphertext, enc_iv: iv, created_at: '2026-01-01T00:00:00Z', updated_at }
}

describe('getCollections', () => {
  it('decrypts and sorts recently updated first', async () => {
    queue('collections', { data: [
      await encryptedRow('a', { name: 'Old', emoji: null, description: null }, '2026-01-01T00:00:00Z'),
      await encryptedRow('b', { name: 'New', emoji: '🎓', description: 'd' }, '2026-02-01T00:00:00Z'),
    ] })
    const result = await getCollections(dek)
    expect(result.map(c => c.name)).toEqual(['New', 'Old'])
    expect(result[0]).toMatchObject({ id: 'b', emoji: '🎓', description: 'd' })
  })

  it('throws on a database error', async () => {
    queue('collections', { error: { message: 'boom' } })
    await expect(getCollections(dek)).rejects.toThrow('boom')
  })
})

describe('getCollection', () => {
  it('returns null for an unknown id', async () => {
    queue('collections', { data: null })
    expect(await getCollection('x', dek)).toBeNull()
  })

  it('returns null for a non-uuid id', async () => {
    queue('collections', { error: { code: '22P02', message: 'invalid input syntax for type uuid' } })
    expect(await getCollection('nope', dek)).toBeNull()
  })

  it('throws on other errors', async () => {
    queue('collections', { error: { code: '500', message: 'down' } })
    await expect(getCollection('x', dek)).rejects.toThrow('down')
  })
})

describe('createCollection', () => {
  it('trims the name, encrypts the content and returns the decrypted row', async () => {
    queue('collections', { data: await encryptedRow('c1', { name: 'Learn Go', emoji: null, description: null }) })
    const result = await createCollection({ name: '  Learn Go  ' }, dek)
    expect(result.error).toBeNull()
    expect(result.data?.name).toBe('Learn Go')
    const insert = callsOf('collections', 'insert')[0].args[0] as { user_id: string; enc_payload: string; enc_iv: string }
    expect(insert.user_id).toBe('u1')
    expect(insert).not.toHaveProperty('name')
    expect(await decryptJson(insert.enc_payload, insert.enc_iv, dek)).toEqual({ name: 'Learn Go', emoji: null, description: null })
  })

  it('refuses a whitespace-only name without writing', async () => {
    expect(await createCollection({ name: '   ' }, dek)).toEqual({ data: null, error: 'name_required' })
    expect(callsOf('collections', 'insert')).toHaveLength(0)
  })

  it('accepts a name that already exists (no uniqueness check)', async () => {
    queue('collections', { data: await encryptedRow('c2', { name: 'Learn Rust', emoji: null, description: null }) })
    const result = await createCollection({ name: 'Learn Rust' }, dek)
    expect(result.error).toBeNull()
    expect(callsOf('collections', 'select').filter(c => c.args[0] === '*')).toHaveLength(0)
  })

  it('returns db_error on a failed insert', async () => {
    queue('collections', { error: { message: 'x' } })
    expect((await createCollection({ name: 'A' }, dek)).error).toBe('db_error')
  })

  it('returns unauthenticated with no user', async () => {
    state.user = null
    expect((await createCollection({ name: 'A' }, dek)).error).toBe('unauthenticated')
  })
})

describe('updateCollection', () => {
  it('updates enc columns of the given id', async () => {
    queue('collections', { data: await encryptedRow('c1', { name: 'Renamed', emoji: '📚', description: null }) })
    const result = await updateCollection({ id: 'c1', name: ' Renamed ', emoji: '📚' }, dek)
    expect(result.data?.name).toBe('Renamed')
    expect(callsOf('collections', 'eq')[0].args).toEqual(['id', 'c1'])
  })

  it('refuses an empty name', async () => {
    expect((await updateCollection({ id: 'c1', name: '' }, dek)).error).toBe('name_required')
  })
})

describe('deleteCollection', () => {
  it('deletes the row by id', async () => {
    queue('collections', { error: null })
    expect(await deleteCollection('c1')).toBe(true)
    expect(callsOf('collections', 'delete')).toHaveLength(1)
  })

  it('returns false on error', async () => {
    queue('collections', { error: { message: 'x' } })
    expect(await deleteCollection('c1')).toBe(false)
  })
})

describe('memberships', () => {
  it('getCollectionMemberships sorts by position, then added_at', async () => {
    queue('collection_links', { data: [
      { collection_id: 'c', link_id: 'b', position: 2, added_at: '2026-01-01T00:00:02Z' },
      { collection_id: 'c', link_id: 'c', position: 1, added_at: '2026-01-01T00:00:03Z' },
      { collection_id: 'c', link_id: 'a', position: 1, added_at: '2026-01-01T00:00:01Z' },
    ] })
    const rows = await getCollectionMemberships('c')
    expect(rows.map(r => r.link_id)).toEqual(['a', 'c', 'b'])
  })

  it('getCollectionMemberships throws on error', async () => {
    queue('collection_links', { error: { message: 'boom' } })
    await expect(getCollectionMemberships('c')).rejects.toThrow()
  })

  it('getCollectionIdsForLink returns collection ids', async () => {
    queue('collection_links', { data: [{ collection_id: 'c1' }, { collection_id: 'c2' }] })
    expect(await getCollectionIdsForLink('l1')).toEqual(['c1', 'c2'])
  })

  it('addLinksToCollection appends after the current max in the given order', async () => {
    queue('collection_links',
      { data: [{ position: 4 }] },
      { data: [
        { collection_id: 'c', link_id: 'y', position: 6, added_at: 't' },
        { collection_id: 'c', link_id: 'x', position: 5, added_at: 't' },
      ] },
    )
    const rows = await addLinksToCollection('c', ['x', 'y'])
    const inserted = callsOf('collection_links', 'insert')[0].args[0]
    expect(inserted).toEqual([
      { collection_id: 'c', link_id: 'x', user_id: 'u1', position: 5 },
      { collection_id: 'c', link_id: 'y', user_id: 'u1', position: 6 },
    ])
    expect(rows?.map(r => r.link_id)).toEqual(['x', 'y'])
  })

  it('addLinksToCollection starts at 1 in an empty collection', async () => {
    queue('collection_links', { data: [] }, { data: [{ collection_id: 'c', link_id: 'x', position: 1, added_at: 't' }] })
    await addLinksToCollection('c', ['x'])
    expect((callsOf('collection_links', 'insert')[0].args[0] as Array<{ position: number }>)[0].position).toBe(1)
  })

  it('addLinksToCollection returns null on failure', async () => {
    queue('collection_links', { data: [] }, { error: { message: 'x' } })
    expect(await addLinksToCollection('c', ['x'])).toBeNull()
  })

  it('removeLinkFromCollection deletes only that membership', async () => {
    queue('collection_links', { error: null })
    expect(await removeLinkFromCollection('c', 'l')).toBe(true)
    expect(callsOf('collection_links', 'eq').map(c => c.args)).toEqual([['collection_id', 'c'], ['link_id', 'l']])
  })

  it('restoreMembership re-inserts with the original position and added_at', async () => {
    queue('collection_links', { error: null })
    const row = { collection_id: 'c', link_id: 'l', position: 3, added_at: '2026-01-01T00:00:00Z' }
    expect(await restoreMembership(row)).toBe(true)
    expect(callsOf('collection_links', 'insert')[0].args[0]).toEqual({ ...row, user_id: 'u1' })
  })

  it('swapCollectionLinkPositions calls the RPC', async () => {
    state.rpc.mockResolvedValue({ error: null })
    expect(await swapCollectionLinkPositions('c', 'a', 'b')).toBe(true)
    expect(state.rpc).toHaveBeenCalledWith('swap_collection_link_positions', { p_collection_id: 'c', p_link_a: 'a', p_link_b: 'b' })
  })

  it('swapCollectionLinkPositions returns false on error', async () => {
    state.rpc.mockResolvedValue({ error: { message: 'x' } })
    expect(await swapCollectionLinkPositions('c', 'a', 'b')).toBe(false)
  })

  it('setLinkCollections appends to added collections and deletes removed memberships', async () => {
    queue('collection_links',
      { data: [{ position: 2 }] }, { data: [{ collection_id: 'c1', link_id: 'l', position: 3, added_at: 't' }] },
      { error: null },
    )
    expect(await setLinkCollections('l', ['c1'], ['c9'])).toBe(true)
    expect(callsOf('collection_links', 'in')[0].args).toEqual(['collection_id', ['c9']])
  })

  it('setLinkCollections returns false when an add fails', async () => {
    queue('collection_links', { data: [] }, { error: { message: 'x' } })
    expect(await setLinkCollections('l', ['c1'], [])).toBe(false)
  })
})

describe('createPendingCollections', () => {
  it('creates one collection per name and returns the ids', async () => {
    queue('collections',
      { data: await encryptedRow('n1', { name: 'Go basics', emoji: null, description: null }) },
      { data: await encryptedRow('n2', { name: 'Rust', emoji: null, description: null }) },
    )
    expect(await createPendingCollections(['Go basics', 'Rust'], dek)).toEqual(['n1', 'n2'])
  })

  it('returns null on any failure', async () => {
    queue('collections', { error: { message: 'x' } })
    expect(await createPendingCollections(['Go basics'], dek)).toBeNull()
  })
})

describe('counts', () => {
  it('getCollectionCounts flattens the structural query', async () => {
    queue('collection_links', { data: [
      { collection_id: 'c', links: { status: 'read', deleted_at: null, link_tags: [{ tag_id: 't', tags: { is_private: true } }] } },
      { collection_id: 'c', links: null },
    ] })
    expect(await getCollectionCounts()).toEqual([
      { collection_id: 'c', status: 'read', deleted_at: null, tags: [{ id: 't', is_private: true }] },
    ])
  })

  it('countCollectionLinks skips Trash and locked private links, and counts read + archived as done', () => {
    const rows = [
      { collection_id: 'c', status: 'read' as const, deleted_at: null, tags: [] },
      { collection_id: 'c', status: 'archived' as const, deleted_at: null, tags: [] },
      { collection_id: 'c', status: 'unread' as const, deleted_at: null, tags: [] },
      { collection_id: 'c', status: 'read' as const, deleted_at: '2026-01-01', tags: [] },
      { collection_id: 'c', status: 'read' as const, deleted_at: null, tags: [{ id: 'p', is_private: true }] },
    ]
    expect(countCollectionLinks(rows, new Set()).get('c')).toEqual({ link_count: 3, done_count: 2 })
    expect(countCollectionLinks(rows, new Set(['p'])).get('c')).toEqual({ link_count: 4, done_count: 3 })
  })

  it('formats the count', () => {
    expect(formatCollectionCount(0, 0)).toBe('0 links · 0 done')
    expect(formatCollectionCount(3, 1)).toBe('3 links · 1 done')
  })

  it('compareMemberships breaks position ties by added_at', () => {
    const a = { collection_id: 'c', link_id: 'a', position: 1, added_at: '2026-01-01T00:00:02Z' }
    const b = { collection_id: 'c', link_id: 'b', position: 1, added_at: '2026-01-01T00:00:01Z' }
    expect([a, b].sort(compareMemberships).map(r => r.link_id)).toEqual(['b', 'a'])
  })
})

describe('getMembershipsForLinks', () => {
  it('makes no request for an empty list', async () => {
    expect(await getMembershipsForLinks([])).toEqual([])
    expect(callsOf('collection_links')).toHaveLength(0)
  })

  it('queries collection_links by link id and returns the rows', async () => {
    const rows = [{ collection_id: 'c1', link_id: 'l1', added_at: 't1' }]
    queue('collection_links', { data: rows })
    expect(await getMembershipsForLinks(['l1', 'l2'])).toEqual(rows)
    expect(callsOf('collection_links', 'select')[0].args[0]).toBe('collection_id, link_id, added_at')
    expect(callsOf('collection_links', 'in')[0].args).toEqual(['link_id', ['l1', 'l2']])
  })

  it('batches the ids 200 at a time and merges the results', async () => {
    const ids = Array.from({ length: 450 }, (_, i) => `l${i}`)
    queue('collection_links',
      { data: [{ collection_id: 'c', link_id: 'l0', added_at: 't' }] },
      { data: [{ collection_id: 'c', link_id: 'l200', added_at: 't' }] },
      { data: [{ collection_id: 'c', link_id: 'l400', added_at: 't' }] },
    )
    const refs = await getMembershipsForLinks(ids)
    const batches = callsOf('collection_links', 'in').map(c => (c.args[1] as string[]))
    expect(batches.map(b => b.length)).toEqual([200, 200, 50])
    expect(batches[1][0]).toBe('l200')
    expect(refs.map(r => r.link_id)).toEqual(['l0', 'l200', 'l400'])
  })

  it('throws on a database error', async () => {
    queue('collection_links', { error: { message: 'boom' } })
    await expect(getMembershipsForLinks(['l1'])).rejects.toThrow('boom')
  })
})
