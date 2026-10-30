'use client'

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { fetchLinkMeta } from '@/app/dashboard/link/actions'
import { updateLinkImage, type LinkWithTags } from '@/lib/services/links'
import { hostGroupOf } from '@/lib/services/importExport/fetchGuard'

/** Minimum time between the end of one image refresh and the start of the next to the same host group. */
export const IMAGE_REFRESH_GAP_MS = 4000

/** Absent = show `image_url` normally. */
export type CardImageState = 'refreshing' | 'failed'

const defaultSleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

/**
 * When a card's image fails to load (e.g. an expired signed Instagram CDN URL),
 * re-runs `fetchLinkMeta` once per link per session through a serial queue,
 * at least IMAGE_REFRESH_GAP_MS apart per host group. A new image is shown
 * right away and saved; anything else leaves the card without an image for the
 * session. A rate-limited answer stops that host group for the session.
 */
export function useCardImageRefresh({
  links,
  setRawLinks,
  dek,
  fetchMeta = fetchLinkMeta,
  updateImage = updateLinkImage,
  now = Date.now,
  sleep = defaultSleep,
}: {
  /** Every loaded link; a queued link that is no longer here is skipped. */
  links: LinkWithTags[]
  setRawLinks: Dispatch<SetStateAction<LinkWithTags[]>>
  dek: CryptoKey | null
  fetchMeta?: typeof fetchLinkMeta
  updateImage?: typeof updateLinkImage
  now?: () => number
  sleep?: (ms: number) => Promise<void>
}) {
  const [imageStateById, setImageStateById] = useState<Record<string, CardImageState>>({})

  const linksRef = useRef(links)
  const dekRef = useRef(dek)
  const depsRef = useRef({ fetchMeta, updateImage, now, sleep })
  useEffect(() => {
    linksRef.current = links
    dekRef.current = dek
    depsRef.current = { fetchMeta, updateImage, now, sleep }
  })

  const attemptedRef = useRef(new Set<string>())
  const queueRef = useRef<string[]>([])
  const runningRef = useRef(false)
  const lastFetchEndRef = useRef(new Map<string, number>())
  const blockedGroupsRef = useRef(new Set<string>())
  const unmountedRef = useRef(false)
  useEffect(() => {
    unmountedRef.current = false
    return () => { unmountedRef.current = true }
  }, [])

  const setImageState = useCallback((id: string, state: CardImageState | null) => {
    if (unmountedRef.current) return
    setImageStateById(prev => {
      if (state === null) {
        if (!(id in prev)) return prev
        const next = { ...prev }
        delete next[id]
        return next
      }
      return prev[id] === state ? prev : { ...prev, [id]: state }
    })
  }, [])

  const findLoaded = (id: string) => linksRef.current.find(l => l.id === id)
  // An invalid URL has no host group; it gets its own key so it never waits on others.
  const groupOf = (link: LinkWithTags) => hostGroupOf(link.url) ?? link.url

  const drain = useCallback(async () => {
    if (runningRef.current) return
    runningRef.current = true
    try {
      while (queueRef.current.length > 0 && !unmountedRef.current) {
        const id = queueRef.current.shift()!
        const { fetchMeta, updateImage, now, sleep } = depsRef.current

        let link = findLoaded(id)
        if (!link) { setImageState(id, null); continue }
        const group = groupOf(link)
        if (blockedGroupsRef.current.has(group)) { setImageState(id, 'failed'); continue }

        const lastEnd = lastFetchEndRef.current.get(group)
        const wait = lastEnd === undefined ? 0 : lastEnd + IMAGE_REFRESH_GAP_MS - now()
        if (wait > 0) {
          await sleep(wait)
          if (unmountedRef.current) return
          link = findLoaded(id)
          if (!link) { setImageState(id, null); continue }
        }

        let meta: Awaited<ReturnType<typeof fetchMeta>> | null
        try {
          meta = await fetchMeta(link.url)
        } catch {
          meta = null
        }
        lastFetchEndRef.current.set(group, now())
        if (unmountedRef.current) return

        if (meta?.rateLimited) {
          blockedGroupsRef.current.add(group)
          setImageState(id, 'failed')
          // Drop the queued refreshes for this host group; they would only be rate-limited too.
          queueRef.current = queueRef.current.filter(queuedId => {
            const queued = findLoaded(queuedId)
            if (!queued) { setImageState(queuedId, null); return false }
            if (groupOf(queued) !== group) return true
            setImageState(queuedId, 'failed')
            return false
          })
          continue
        }

        const current = findLoaded(id)
        if (!current) { setImageState(id, null); continue }
        const image = meta?.image ?? null
        if (!image || image === current.image_url) { setImageState(id, 'failed'); continue }

        setRawLinks(prev => prev.map(l => l.id === id ? { ...l, image_url: image } : l))
        setImageState(id, null)
        const currentDek = dekRef.current
        // A failed save still shows the new image this session; the next session retries.
        if (currentDek) updateImage(current, image, currentDek).catch(() => {})
      }
    } finally {
      runningRef.current = false
    }
  }, [setImageState, setRawLinks])

  const handleImageError = useCallback((id: string) => {
    // Already tried (e.g. the refreshed URL failed too): no second refresh this session.
    if (attemptedRef.current.has(id)) {
      setImageState(id, 'failed')
      return
    }
    const link = findLoaded(id)
    if (!link) return
    attemptedRef.current.add(id)
    if (blockedGroupsRef.current.has(groupOf(link))) {
      setImageState(id, 'failed')
      return
    }
    setImageState(id, 'refreshing')
    queueRef.current.push(id)
    void drain()
  }, [drain, setImageState])

  return { imageStateById, handleImageError }
}
