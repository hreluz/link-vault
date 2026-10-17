'use server'

export type LinkMeta = {
  title: string | null
  description: string | null
  image: string | null
  duration: string | null
  /** True when the page (or YouTube oEmbed) answered HTTP 429. */
  rateLimited?: boolean
}

const NULL_META: LinkMeta = { title: null, description: null, image: null, duration: null }

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ',
}

// Attribute values come straight out of raw HTML, so entities like &quot; or
// &#x1f64b; (Instagram encodes quotes/emoji this way) must be decoded. A single
// pass means double-encoded text (&amp;quot;) decodes once, not twice.
function decodeHtmlEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, body: string) => {
    if (body[0] === '#') {
      const code = body[1].toLowerCase() === 'x' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10)
      try { return String.fromCodePoint(code) } catch { return match }
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? match
  })
}

function extractMeta(html: string, baseUrl: string): LinkMeta {
  const attr = (tag: string, prop: string) => {
    const re = new RegExp(
      `<meta[^>]+${prop}[^>]*content=["']([^"']+)["']|<meta[^>]+content=["']([^"']+)["'][^>]+${prop}`,
      'i',
    )
    const m = html.match(re)
    const raw = m ? (m[1] ?? m[2] ?? null) : null
    return raw ? decodeHtmlEntities(raw) : null
  }

  const ogTitle = attr('', 'property=["\']og:title["\']')
  const ogDesc = attr('', 'property=["\']og:description["\']')
  const ogImage = attr('', 'property=["\']og:image["\']')

  let title = ogTitle
  if (!title) {
    const m = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    title = m ? decodeHtmlEntities(m[1].trim()) : null
  }

  let image: string | null = null
  if (ogImage) {
    try {
      image = new URL(ogImage, baseUrl).href
    } catch {
      image = null
    }
  }

  return { title, description: ogDesc, image, duration: null }
}

function extractYouTubeVideoId(url: string): string | null {
  try {
    const u = new URL(url)
    const host = u.hostname.replace('www.', '')
    if (host === 'youtu.be') return u.pathname.slice(1).split('/')[0] || null
    if (host === 'youtube.com') {
      if (u.pathname.startsWith('/watch')) return u.searchParams.get('v')
      const m = u.pathname.match(/^\/(shorts|embed)\/([^/?]+)/)
      return m ? m[2] : null
    }
    return null
  } catch {
    return null
  }
}

async function fetchYouTubeOEmbed(
  url: string,
): Promise<{ title: string | null; image: string | null; rateLimited: boolean }> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
      { signal: AbortSignal.timeout(5000) },
    )
    if (!res.ok) return { title: null, image: null, rateLimited: res.status === 429 }
    const data = await res.json()
    return { title: data?.title ?? null, image: data?.thumbnail_url ?? null, rateLimited: false }
  } catch {
    return { title: null, image: null, rateLimited: false }
  }
}

function parseIsoDuration(iso: string): string {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!m) return ''
  const h = parseInt(m[1] ?? '0')
  const min = parseInt(m[2] ?? '0')
  const sec = parseInt(m[3] ?? '0')
  const mm = String(min).padStart(h > 0 ? 2 : 1, '0')
  const ss = String(sec).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

export async function fetchLinkMeta(url: string): Promise<LinkMeta> {
  try {
    new URL(url)
  } catch {
    return NULL_META
  }

  const meta: LinkMeta = { ...NULL_META }
  const videoId = extractYouTubeVideoId(url)

  if (videoId) {
    // youtube.com's raw page is frequently served a bot/consent placeholder when
    // fetched from datacenter IPs (e.g. Vercel), and fetching it is extra load on
    // the host most likely to rate-limit an import. oEmbed is the official,
    // key-free endpoint for title/thumbnail, so it is the only page-level request.
    const oembed = await fetchYouTubeOEmbed(url)
    meta.title = oembed.title
    meta.image = oembed.image
    if (oembed.rateLimited) meta.rateLimited = true
  } else {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(5000),
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LinkVaultBot/1.0)' },
      })
      if (res.status === 429) meta.rateLimited = true
      if (res.ok) {
        const contentType = res.headers.get('content-type') ?? ''
        if (contentType.includes('text/html')) {
          const html = await res.text()
          Object.assign(meta, extractMeta(html, url))
        }
      }
    } catch {
      // og fetch failed — meta stays empty
    }
  }

  const apiKey = process.env.YOUTUBE_API_KEY
  if (videoId && apiKey) {
    try {
      // Same 1-unit quota cost with `snippet` added; it supplies the description
      // the raw page used to provide. Its errors (e.g. quotaExceeded) never mark
      // the link as rate-limited — they only leave duration/description null.
      const ytRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=contentDetails,snippet&key=${apiKey}`,
        { signal: AbortSignal.timeout(5000) },
      )
      if (ytRes.ok) {
        const ytData = await ytRes.json()
        const item = ytData?.items?.[0]
        const isoDuration = item?.contentDetails?.duration
        if (isoDuration) meta.duration = parseIsoDuration(isoDuration)
        const description = item?.snippet?.description
        if (description) meta.description = description
      }
    } catch {
      // YouTube API failed — duration/description stay null
    }
  }

  return meta
}
