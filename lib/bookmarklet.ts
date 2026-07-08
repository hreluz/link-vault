/**
 * Builds the `javascript:` URI for the "Save to Link Vault" bookmarklet.
 * Runs in the context of whatever page it's clicked from, so `location.href`
 * and `document.title` resolve to that page, not this app.
 */
export function buildBookmarkletHref(origin: string): string {
  const script = `window.open(${JSON.stringify(origin)}+'/dashboard?add=1&url='+encodeURIComponent(location.href)+'&title='+encodeURIComponent(document.title))`
  return `javascript:(function(){${script}})()`
}

/**
 * Builds the post-login destination, resuming a bookmarklet capture that got
 * routed through /login (proxy.ts) because the user had no session. Returns
 * a bare /dashboard when there's nothing to resume.
 */
export function buildCaptureResumeUrl(url: string | null, title: string | null): string {
  if (!url) return '/dashboard'
  return `/dashboard?add=1&url=${encodeURIComponent(url)}&title=${encodeURIComponent(title ?? '')}`
}
