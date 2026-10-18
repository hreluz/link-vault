import { createClient } from '@/lib/supabase/client'
import { hmacFingerprint } from '@/lib/crypto/vault'
import { toEncryptedColumns, fromEncryptedColumns } from '@/lib/crypto/encryptedRow'
import { syncTagsByName } from '@/lib/services/tags/tags'
import { createFetchGuard, hostGroupOf, needsMetaFetch, type FetchGuard, type FetchGuardConfig } from '@/lib/services/importExport/fetchGuard'
import type { LinkStatus } from '@/lib/types/database'
import type { SortBy } from '@/app/dashboard/link/FilterSheet'

export type LinkContent = {
  url: string
  title: string | null
  description: string | null
  site_name: string | null
  image_url: string | null
  duration: string | null
  notes: string | null
}

export type LinkWithTags = LinkContent & {
  id: string
  user_id: string
  category_id: string | null
  status: LinkStatus
  is_favorite: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
  tags: string[] // tag ids
}

export type LinkFilterParams = {
  textSearch: string
  categoryId: string | null
  statuses: LinkStatus[]
  tagIds: string[]
  tagMode: 'any' | 'all'
  favoritesOnly: boolean
  sortBy: SortBy
  unlockedTagIds: string[]
}

export const SELECT_ALL_MATCHING_CAP = 2000
const FETCH_CHUNK_SIZE = 200

type LinkRow = {
  id: string
  user_id: string
  category_id: string | null
  status: LinkStatus
  is_favorite: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
  enc_payload: string
  enc_iv: string
}

type LinkQueryRow = LinkRow & {
  link_tags: Array<{ tag_id: string }>
}

async function toLinkWithTags(row: LinkRow, tags: string[], dek: CryptoKey): Promise<LinkWithTags> {
  const link = await fromEncryptedColumns<LinkContent, LinkRow>(row, dek)
  return { ...link, tags }
}

export type CreateLinkInput = {
  url: string
  title?: string | null
  description?: string | null
  image_url?: string | null
  duration?: string | null
  category_id: string
  status: LinkStatus
  notes?: string | null
  tags: string[]
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

async function insertLinkTags(linkId: string, tagIds: string[]): Promise<void> {
  if (tagIds.length === 0) return
  const supabase = createClient()
  await supabase.from('link_tags').insert(tagIds.map(tag_id => ({ link_id: linkId, tag_id })))
}

export async function createLink(input: CreateLinkInput, dek: CryptoKey): Promise<LinkWithTags | null> {
  if (!input.url.trim() || !isValidUrl(input.url)) return null
  if (!input.category_id) return null

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const url = input.url.trim()
  const content: LinkContent = {
    url,
    title: input.title ?? null,
    description: input.description ?? null,
    site_name: new URL(url).hostname,
    image_url: input.image_url ?? null,
    duration: input.duration ?? null,
    notes: input.notes ?? null,
  }

  const encoded = await toEncryptedColumns<LinkContent>(content, dek)
  const url_fingerprint = await hmacFingerprint(url, dek)

  const { data: link, error } = await supabase
    .from('links')
    .insert({
      user_id: user.id,
      ...encoded,
      url_fingerprint,
      category_id: input.category_id,
      status: input.status,
    })
    .select()
    .single()

  if (error || !link) return null

  const tagIds = await syncTagsByName(input.tags.filter(Boolean), dek)
  await insertLinkTags(link.id, tagIds)

  return { ...content, id: link.id, user_id: link.user_id, category_id: link.category_id, status: link.status,
    is_favorite: link.is_favorite, created_at: link.created_at, updated_at: link.updated_at,
    deleted_at: link.deleted_at, tags: tagIds }
}

export type UpdateLinkInput = {
  id: string
  url: string
  title?: string | null
  description?: string | null
  image_url?: string | null
  duration?: string | null
  category_id: string
  status: LinkStatus
  notes?: string | null
  tags: string[]
}

export async function toggleLinkFavorite(id: string, isFavorite: boolean): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase
    .from('links')
    .update({ is_favorite: isFavorite })
    .eq('id', id)
  return !error
}

export async function updateLink(input: UpdateLinkInput, dek: CryptoKey): Promise<LinkWithTags | null> {
  if (!input.url.trim() || !isValidUrl(input.url)) return null
  if (!input.category_id) return null

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const url = input.url.trim()
  const content: LinkContent = {
    url,
    title: input.title ?? null,
    description: input.description ?? null,
    site_name: new URL(url).hostname,
    image_url: input.image_url ?? null,
    duration: input.duration ?? null,
    notes: input.notes ?? null,
  }

  const encoded = await toEncryptedColumns<LinkContent>(content, dek)
  const url_fingerprint = await hmacFingerprint(url, dek)

  const { data: link, error } = await supabase
    .from('links')
    .update({
      ...encoded,
      url_fingerprint,
      category_id: input.category_id,
      status: input.status,
    })
    .eq('id', input.id)
    .select()
    .single()

  if (error || !link) return null

  await supabase.from('link_tags').delete().eq('link_id', input.id)

  const tagIds = await syncTagsByName(input.tags.filter(Boolean), dek)
  await insertLinkTags(link.id, tagIds)

  return { ...content, id: link.id, user_id: link.user_id, category_id: link.category_id, status: link.status,
    is_favorite: link.is_favorite, created_at: link.created_at, updated_at: link.updated_at,
    deleted_at: link.deleted_at, tags: tagIds }
}

/** Unpaginated -- used only by Import/Export, never the main list. */
export async function getLinks(dek: CryptoKey): Promise<LinkWithTags[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('links')
    .select('*, link_tags(tag_id)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .returns<LinkQueryRow[]>()

  if (error || !data) return []

  return Promise.all(data.map(({ link_tags, ...row }) =>
    toLinkWithTags(row, link_tags.map(lt => lt.tag_id), dek)
  ))
}

/** Fetches specific links by id (chunked) and decrypts them. Used by client-side search/sort. */
export async function getLinksByIds(ids: string[], dek: CryptoKey): Promise<LinkWithTags[]> {
  if (ids.length === 0) return []
  const supabase = createClient()

  const rows: LinkQueryRow[] = []
  for (let i = 0; i < ids.length; i += FETCH_CHUNK_SIZE) {
    const chunk = ids.slice(i, i + FETCH_CHUNK_SIZE)
    const { data } = await supabase
      .from('links')
      .select('*, link_tags(tag_id)')
      .in('id', chunk)
      .returns<LinkQueryRow[]>()
    if (data) rows.push(...data)
  }

  return Promise.all(rows.map(({ link_tags, ...row }) =>
    toLinkWithTags(row, link_tags.map(lt => lt.tag_id), dek)
  ))
}

function toRpcFilterArgs(params: LinkFilterParams) {
  return {
    p_category_id: params.categoryId,
    p_statuses: params.statuses.length ? params.statuses : null,
    p_tag_ids: params.tagIds.length ? params.tagIds : null,
    p_tag_mode: params.tagMode,
    p_favorites_only: params.favoritesOnly,
    p_unlocked_tag_ids: params.unlockedTagIds.length ? params.unlockedTagIds : null,
  }
}

export type LinksPage = { links: LinkWithTags[]; totalCount: number }

/** Structural-only pagination -- no free-text search, no alphabetical sort (impossible against ciphertext). */
export async function getLinksPage(
  params: LinkFilterParams,
  limit: number,
  offset: number,
  dek: CryptoKey,
): Promise<LinksPage> {
  const supabase = createClient()

  const { data, error } = await supabase
    .rpc('search_links', {
      ...toRpcFilterArgs(params),
      p_sort_by: params.sortBy === 'alphabetical' ? 'newest' : params.sortBy,
      p_limit: limit,
      p_offset: offset,
    })
    .returns<Array<LinkRow & { tags: string[]; total_count: number }>>()

  if (error || !data) return { links: [], totalCount: 0 }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to omit it from `row`
  const links = await Promise.all(data.map(({ tags, total_count, ...row }) => toLinkWithTags(row, tags, dek)))
  return { links, totalCount: data[0]?.total_count ?? 0 }
}

export type MatchingLinkIds = { ids: string[]; totalCount: number }

/** Ids-only, matching only structural filters -- used for "select all matching" and client-side search/sort. */
export async function getMatchingLinkIds(params: LinkFilterParams): Promise<MatchingLinkIds> {
  const supabase = createClient()

  const { data, error } = await supabase
    .rpc('search_link_ids', {
      ...toRpcFilterArgs(params),
      p_limit: SELECT_ALL_MATCHING_CAP,
    })
    .returns<{ id: string; total_count: number }[]>()

  if (error || !data) return { ids: [], totalCount: 0 }

  return {
    ids: data.map(row => row.id),
    totalCount: data[0]?.total_count ?? 0,
  }
}

export type DeleteLinkResult = 'deleted' | 'blocked' | 'error'

/** Refuses to delete a favorited link -- `.eq('is_favorite', false)` makes this a real DB-enforced invariant. */
export async function deleteLink(id: string): Promise<DeleteLinkResult> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('links')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('is_favorite', false)
    .select('id')
  if (error) return 'error'
  return (data?.length ?? 0) > 0 ? 'deleted' : 'blocked'
}

export async function bulkUpdateStatus(ids: string[], status: LinkStatus): Promise<boolean> {
  if (!ids.length) return true
  const supabase = createClient()
  const { error } = await supabase.from('links').update({ status }).in('id', ids)
  return !error
}

export type BulkSoftDeleteResult = { deletedIds: string[] }

/** Favorited links are skipped -- `.eq('is_favorite', false)` makes this a real DB-enforced invariant. */
export async function bulkSoftDelete(ids: string[]): Promise<BulkSoftDeleteResult | null> {
  if (!ids.length) return { deletedIds: [] }
  const supabase = createClient()
  const { data, error } = await supabase
    .from('links')
    .update({ deleted_at: new Date().toISOString() })
    .in('id', ids)
    .eq('is_favorite', false)
    .select('id')
  if (error) return null
  return { deletedIds: (data ?? []).map(row => row.id) }
}

export async function bulkUpdateCategory(ids: string[], categoryId: string | null): Promise<boolean> {
  if (!ids.length) return true
  const supabase = createClient()
  const { error } = await supabase.from('links').update({ category_id: categoryId }).in('id', ids)
  return !error
}

/** Returns the resolved tag ids on success (so callers can patch already-loaded links), or null on failure. */
export async function bulkAddTags(ids: string[], tagNames: string[], dek: CryptoKey): Promise<string[] | null> {
  if (!ids.length || !tagNames.length) return []
  const supabase = createClient()

  const tagIds = await syncTagsByName(tagNames.filter(Boolean), dek)
  if (!tagIds.length) return null

  const pairs = ids.flatMap(link_id => tagIds.map(tag_id => ({ link_id, tag_id })))
  const { error } = await supabase
    .from('link_tags')
    .upsert(pairs, { onConflict: 'link_id,tag_id', ignoreDuplicates: true })

  return error ? null : tagIds
}

/** Returns the id of the user's existing non-deleted link with this URL, if any. */
export async function findLinkIdByUrl(url: string, dek: CryptoKey): Promise<string | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const url_fingerprint = await hmacFingerprint(url, dek)
  const { data: existingRows } = await supabase
    .from('links')
    .select('id')
    .eq('user_id', user.id)
    .eq('url_fingerprint', url_fingerprint)
    .is('deleted_at', null)
    .limit(1)

  return existingRows?.[0]?.id ?? null
}

export type ImportLinkInput = {
  url: string
  title?: string | null
  description?: string | null
  site_name?: string | null
  image_url?: string | null
  duration?: string | null
  notes?: string | null
  status?: LinkStatus
  is_favorite?: boolean
  created_at?: string
  updated_at?: string
  tags?: string[]
  category_id?: string | null
}

export type ImportResult = {
  imported: number
  skipped: number
  duplicates: number
  /** Links whose metadata fetch threw or came back empty. Only set when a fetcher was supplied. */
  metaMissing?: number
  /** One entry per row counted in `skipped`, in input order. */
  failures: ImportFailure[]
  /** True when the signal stopped the loop early. */
  cancelled: boolean
  /** URLs of rows never started, in input order; `[]` when not cancelled. */
  notProcessed: string[]
}

export type ImportFailureReason = 'invalid_url' | 'save_error'
export type ImportFailure = { url: string; reason: ImportFailureReason }

/** What happened to a single import row, reported through `importLinks`'s `onProgress`. */
export type ImportRowOutcome =
  | { url: string; status: 'imported'; metaMissing: boolean }
  | { url: string; status: 'duplicate' }
  | { url: string; status: 'failed'; reason: ImportFailureReason }

/** Structurally matches `LinkMeta` from `app/dashboard/link/actions.ts`, so `fetchLinkMeta`
 *  can be passed straight in without this service importing from `app/`. */
export type ImportMeta = {
  title: string | null
  description: string | null
  image: string | null
  duration: string | null
  /** True when the page (or YouTube oEmbed) answered HTTP 429. */
  rateLimited?: boolean
}
export type ImportMetaFetcher = (url: string) => Promise<ImportMeta>

/** Why a host group tripped the import's fetch breaker (see `fetchGuard.ts`). */
export type HostBlockReason = 'rate_limited' | 'empty_responses'
/** `attempt` starts at 1 and grows each time a retry of the same row is still blocked. */
export type HostBlockInfo = { host: string; reason: HostBlockReason; attempt: number }
export type HostBlockDecision = 'retry' | 'skip_host' | 'cancel'
/** A same-host throttle wait: `host` is the host group, `until` the epoch ms the fetch may start. */
export type ThrottleWait = { host: string; until: number }

export type ImportLinksOptions = {
  onProgress?: (done: number, total: number, outcome: ImportRowOutcome) => void
  fetchMeta?: ImportMetaFetcher
  /** Checked before each row. Once aborted, no new row starts. */
  signal?: AbortSignal
  /** Awaited when a host group trips the breaker; the import is paused until it resolves.
   *  When absent, behaves as 'skip_host'. Only consulted when fetchMeta is set. */
  onHostBlocked?: (info: HostBlockInfo) => Promise<HostBlockDecision>
  /** Admin-configured gap and empty-streak limit for this run; defaults when absent. */
  guardConfig?: FetchGuardConfig
  /** Called with the wait before a same-host gap of >= 1 s starts, and with null when it ends. */
  onThrottleWait?: (wait: ThrottleWait | null) => void
}

const isEmpty = (value: string | null | undefined) => value == null || value === ''

const isMetaEmpty = (meta: ImportMeta | null) =>
  !meta || (!meta.title && !meta.description && !meta.image && !meta.duration)

/** Fills only the fields the import row left empty -- values supplied by the file always win. */
function mergeMeta(input: ImportLinkInput, meta: ImportMeta | null): ImportLinkInput {
  if (!meta) return input
  return {
    ...input,
    title: isEmpty(input.title) ? (meta.title ?? input.title) : input.title,
    description: isEmpty(input.description) ? (meta.description ?? input.description) : input.description,
    image_url: isEmpty(input.image_url) ? (meta.image ?? input.image_url) : input.image_url,
    duration: isEmpty(input.duration) ? (meta.duration ?? input.duration) : input.duration,
  }
}

/** Fetches one row's metadata through the throttle/breaker. While the group looks blocked
 *  the row is held and `onHostBlocked` decides: retry the same row, skip the group's
 *  metadata (row imported as-is), or cancel. Returns `'cancelled'` when the row must not
 *  be inserted -- a cancel during the throttle wait or a 'cancel' decision. */
async function fetchRowMeta(
  input: ImportLinkInput,
  url: string,
  group: string,
  guard: FetchGuard,
  fetchMeta: ImportMetaFetcher,
  options: ImportLinksOptions,
): Promise<{ input: ImportLinkInput; metaMissing: boolean } | 'cancelled'> {
  const { signal, onHostBlocked, onThrottleWait } = options
  let attempt = 0

  for (;;) {
    let waitReported = false
    await guard.waitTurn(group, signal, onThrottleWait && (until => {
      waitReported = true
      onThrottleWait({ host: group, until })
    }))
    // Cleared before the abort check so a cancel during the wait also clears it.
    if (waitReported) onThrottleWait?.(null)
    if (signal?.aborted) return 'cancelled'

    let meta: ImportMeta | null
    try {
      meta = await fetchMeta(url)
    } catch {
      meta = null
    }

    const tripped = guard.record(group, meta)
    // On a retry, any 429 or empty result is still a block -- the streak doesn't apply.
    const reason = attempt === 0
      ? tripped
      : meta?.rateLimited ? 'rate_limited' : isMetaEmpty(meta) ? 'empty_responses' : null

    if (!reason) {
      if (attempt > 0) guard.resetGroup(group)
      return { input: mergeMeta(input, meta), metaMissing: isMetaEmpty(meta) }
    }

    attempt++
    const decision = onHostBlocked ? await onHostBlocked({ host: group, reason, attempt }) : 'skip_host'
    if (decision === 'cancel' || signal?.aborted) return 'cancelled'
    if (decision === 'skip_host') {
      guard.skip(group)
      return { input, metaMissing: true }
    }
  }
}

export async function importLinks(
  inputs: ImportLinkInput[],
  defaultCategoryId: string | null,
  dek: CryptoKey,
  options: ImportLinksOptions = {},
): Promise<ImportResult> {
  const { onProgress, fetchMeta, signal, guardConfig } = options
  const guard = fetchMeta ? createFetchGuard({ config: guardConfig }) : null
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return {
      imported: 0, skipped: inputs.length, duplicates: 0,
      failures: inputs.map(input => ({ url: input.url, reason: 'save_error' as const })),
      cancelled: false, notProcessed: [],
    }
  }

  let imported = 0
  let duplicates = 0
  let metaMissing = 0
  let processed = 0
  const failures: ImportFailure[] = []
  let notProcessed: string[] = []

  for (const [index, rawInput] of inputs.entries()) {
    // Checked between rows only, so the row in progress always finishes completely.
    if (signal?.aborted) {
      notProcessed = inputs.slice(index).map(remaining => remaining.url.trim())
      break
    }
    let input = rawInput
    let outcome: ImportRowOutcome | null = null
    // `finally` still runs on every `continue` below, so progress always reaches
    // `inputs.length` regardless of which outcome (skip/duplicate/error/success) hit.
    // A row that throws has no outcome; the throw aborts the whole import anyway.
    try {
      if (!input.url.trim() || !isValidUrl(input.url)) {
        outcome = { url: input.url, status: 'failed', reason: 'invalid_url' }
        continue
      }

      const trimmedUrl = input.url.trim()
      const url_fingerprint = await hmacFingerprint(trimmedUrl, dek)

      const existingId = await findLinkIdByUrl(trimmedUrl, dek)
      if (existingId) {
        duplicates++
        outcome = { url: trimmedUrl, status: 'duplicate' }
        continue
      }

      // Sequential on purpose: one fetch in flight at a time, and only for new, valid URLs
      // that still have an empty metadata field. Throttled and breaker-guarded per host group.
      let rowMetaMissing = false
      if (fetchMeta && guard && needsMetaFetch(input)) {
        const group = hostGroupOf(trimmedUrl) ?? trimmedUrl
        if (guard.isSkipped(group)) {
          rowMetaMissing = true
        } else {
          const fetched = await fetchRowMeta(input, trimmedUrl, group, guard, fetchMeta, options)
          if (fetched === 'cancelled') {
            // Nothing was written for this row, so it counts as not processed.
            notProcessed = inputs.slice(index).map(remaining => remaining.url.trim())
            break
          }
          input = fetched.input
          rowMetaMissing = fetched.metaMissing
        }
        if (rowMetaMissing) metaMissing++
      }

      const category_id = input.category_id ?? defaultCategoryId
      const content: LinkContent = {
        url: trimmedUrl,
        title: input.title ?? null,
        description: input.description ?? null,
        site_name: input.site_name ?? new URL(trimmedUrl).hostname,
        image_url: input.image_url ?? null,
        duration: input.duration ?? null,
        notes: input.notes ?? null,
      }
      const encoded = await toEncryptedColumns<LinkContent>(content, dek)

      const { data: link, error } = await supabase
        .from('links')
        .insert({
          user_id: user.id,
          ...encoded,
          url_fingerprint,
          category_id,
          status: input.status ?? 'unread',
          is_favorite: input.is_favorite ?? false,
          // Only an explicit "everything" restore sets these; normal imports keep the DB's now() defaults.
          ...(input.created_at ? { created_at: input.created_at } : {}),
          ...(input.updated_at ? { updated_at: input.updated_at } : {}),
        })
        .select()
        .single()

      if (error || !link) {
        outcome = { url: trimmedUrl, status: 'failed', reason: 'save_error' }
        continue
      }

      const tagIds = await syncTagsByName(input.tags?.filter(Boolean) ?? [], dek)
      await insertLinkTags(link.id, tagIds)
      imported++
      outcome = { url: trimmedUrl, status: 'imported', metaMissing: rowMetaMissing }
    } finally {
      if (outcome?.status === 'failed') failures.push({ url: outcome.url, reason: outcome.reason })
      processed++
      if (outcome) onProgress?.(processed, inputs.length, outcome)
    }
  }

  const skipped = failures.length
  const cancelled = notProcessed.length > 0
  return fetchMeta
    ? { imported, skipped, duplicates, metaMissing, failures, cancelled, notProcessed }
    : { imported, skipped, duplicates, failures, cancelled, notProcessed }
}
