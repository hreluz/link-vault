// Fully visible between the bottom of the sticky chrome (the DashboardHeader, plus
// the desktop section tabs from sm up -- SPEC 38) and the bottom of the viewport.
// The hidden mobile-width tabs report a bottom of 0, so max() skips them.
export function isFullyVisibleBelowChrome(el: Element): boolean {
  const headerBottom = Math.max(0, ...Array.from(document.querySelectorAll('[data-sticky-chrome]'))
    .map(chrome => chrome.getBoundingClientRect().bottom))
  const rect = el.getBoundingClientRect()
  return rect.top >= headerBottom && rect.bottom <= window.innerHeight
}

export function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Scrolls the element into view (smooth, or instant with reduced motion) only if it isn't fully visible. */
export function scrollIntoViewIfHidden(el: Element): void {
  if (isFullyVisibleBelowChrome(el)) return
  el.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
}
