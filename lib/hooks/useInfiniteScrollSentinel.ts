'use client'

import { useEffect, useRef } from 'react'

export function useInfiniteScrollSentinel(onIntersect: () => void, enabled: boolean) {
  const ref = useRef<HTMLDivElement>(null)
  const onIntersectRef = useRef(onIntersect)

  useEffect(() => {
    onIntersectRef.current = onIntersect
  })

  useEffect(() => {
    if (!enabled) return
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) onIntersectRef.current()
    }, { rootMargin: '400px' })

    observer.observe(el)
    return () => observer.disconnect()
  }, [enabled])

  return ref
}
