'use server'

export type LinkMeta = {
  title: string | null
  description: string | null
  image: string | null
}

const NULL_META: LinkMeta = { title: null, description: null, image: null }

function extractMeta(html: string, baseUrl: string): LinkMeta {
  const attr = (tag: string, prop: string) => {
    const re = new RegExp(
      `<meta[^>]+${prop}[^>]*content=["']([^"']+)["']|<meta[^>]+content=["']([^"']+)["'][^>]+${prop}`,
      'i',
    )
    const m = html.match(re)
    return m ? (m[1] ?? m[2] ?? null) : null
  }

  const ogTitle = attr('', 'property=["\']og:title["\']')
  const ogDesc = attr('', 'property=["\']og:description["\']')
  const ogImage = attr('', 'property=["\']og:image["\']')

  let title = ogTitle
  if (!title) {
    const m = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    title = m ? m[1].trim() : null
  }

  let image: string | null = null
  if (ogImage) {
    try {
      image = new URL(ogImage, baseUrl).href
    } catch {
      image = null
    }
  }

  return { title, description: ogDesc, image }
}

export async function fetchLinkMeta(url: string): Promise<LinkMeta> {
  try {
    new URL(url)
  } catch {
    return NULL_META
  }

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LinkVaultBot/1.0)' },
    })
    if (!res.ok) return NULL_META
    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.includes('text/html')) return NULL_META
    const html = await res.text()
    return extractMeta(html, url)
  } catch {
    return NULL_META
  }
}
