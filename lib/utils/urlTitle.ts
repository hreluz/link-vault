/** The URL's decoded path without surrounding slashes, or its hostname when there is no path. */
export function titleFromUrl(url: string): string {
  const trimmed = url.trim()
  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return trimmed.replace(/^https?:\/\//, '')
  }

  const path = parsed.pathname.replace(/^\/+|\/+$/g, '')
  if (!path) return parsed.hostname

  try {
    return decodeURIComponent(path)
  } catch {
    // Malformed percent-encoding: keep the raw path rather than failing the save.
    return path
  }
}

/** The link's title for display: its stored title, or `titleFromUrl(url)` when the title is null or empty. Never written back. */
export function displayTitle(link: { title: string | null; url: string }): string {
  return link.title || titleFromUrl(link.url)
}
