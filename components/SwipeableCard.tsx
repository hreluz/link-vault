'use client'

import { useRef, useEffect } from 'react'

interface Props {
  onSwipeDelete?: () => void
  children: React.ReactNode
}

export default function SwipeableCard({ onSwipeDelete, children }: Props) {
  const innerRef = useRef<HTMLDivElement>(null)
  const onSwipeDeleteRef = useRef(onSwipeDelete)

  useEffect(() => { onSwipeDeleteRef.current = onSwipeDelete })

  useEffect(() => {
    const el = innerRef.current as HTMLDivElement
    if (!el) return

    let startX = 0
    let startY = 0
    let currentDx = 0
    let isDragging = false
    let isHorizontal = false

    function onTouchStart(e: TouchEvent) {
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
      currentDx = 0
      isDragging = true
      isHorizontal = false
      el.style.transition = 'none'
    }

    function onTouchMove(e: TouchEvent) {
      if (!isDragging) return
      const dx = e.touches[0].clientX - startX
      const dy = e.touches[0].clientY - startY

      if (!isHorizontal) {
        if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return
        if (Math.abs(dy) > Math.abs(dx)) {
          isDragging = false
          return
        }
        isHorizontal = true
      }

      if (dx >= 0) return
      e.preventDefault()
      currentDx = dx
      el.style.transform = `translateX(${dx}px)`
    }

    function onTouchEnd() {
      if (!isDragging) return
      isDragging = false

      const cardWidth = el.offsetWidth
      const threshold = cardWidth * 0.4
      el.style.transition = 'transform 0.25s ease'

      if (currentDx < -threshold && onSwipeDeleteRef.current) {
        el.style.transform = `translateX(-${cardWidth}px)`
        setTimeout(() => onSwipeDeleteRef.current?.(), 250)
      } else {
        el.style.transform = 'translateX(0)'
      }
    }

    el.addEventListener('touchstart', onTouchStart)
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd)

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, []) // run once — callback is always current via onSwipeDeleteRef

  return (
    <div className="relative overflow-hidden rounded-2xl shadow-sm ring-1 ring-slate-200 transition hover:shadow-md hover:ring-slate-300 dark:ring-slate-700 dark:hover:ring-slate-600">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-end bg-red-100 pr-5 dark:bg-red-900/40" aria-hidden="true">
        <span className="text-2xl text-red-400">🗑️</span>
      </div>
      <div ref={innerRef} className="relative h-full">
        {children}
      </div>
    </div>
  )
}
