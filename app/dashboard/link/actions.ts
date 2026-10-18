'use server'

export type LinkMeta = {
  title: string | null
  description: string | null
  image: string | null
  duration: string | null
  /** True when the page (or YouTube oEmbed) answered HTTP 429. */
  rateLimited?: boolean
  /** True when the page was an app shell: no og tags and a brand-only <title> (dropped). */
  generic?: boolean
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

type ExtractedMeta = {
  meta: LinkMeta
  /** At least one of og:title, og:description, og:image was found. */
  hasOg: boolean
  /** meta.title came from og:title, not from <title>. */
  titleFromOg: boolean
}

function extractMeta(html: string, baseUrl: string): ExtractedMeta {
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

  return {
    meta: { title, description: ogDesc, image, duration: null },
    hasOg: ogTitle != null || ogDesc != null || ogImage != null,
    titleFromOg: ogTitle != null,
  }
}

// Separators between a brand and its tagline ("TikTok - Make Your Day"). Spaces are
// required so hyphenated words ("Instagram-clone tutorial") are never split.
const TITLE_SEPARATORS = [' - ', ' – ', ' — ', ' | ', ' · ', ': ']

const normalizeBrand = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')

/** The hostname's second-to-last label (www.instagram.com → instagram). Multi-part TLDs
 *  give a label that never matches (bbc.co.uk → co), so titles there are always kept. */
function brandLabel(url: string): string | null {
  try {
    const labels = new URL(url).hostname.split('.').filter(Boolean)
    return labels.length >= 2 ? normalizeBrand(labels[labels.length - 2]) || null : null
  } catch {
    return null
  }
}

/** A <title> that is only the site's brand, or (with no og tags at all) brand + tagline. */
function isGenericTitle(title: string, brand: string, hasOg: boolean): boolean {
  if (normalizeBrand(title) === brand) return true
  if (hasOg) return false
  const cuts = TITLE_SEPARATORS.map(sep => title.indexOf(sep)).filter(i => i > 0)
  return cuts.length > 0 && normalizeBrand(title.slice(0, Math.min(...cuts))) === brand
}

/** Drops a brand-only <title> fallback; with no og tags either, the page is flagged generic.
 *  Titles from og:title are never filtered. */
function finalizeMeta({ meta, hasOg, titleFromOg }: ExtractedMeta, url: string): LinkMeta {
  const brand = brandLabel(url)
  if (titleFromOg || !meta.title || !brand || !isGenericTitle(meta.title, brand, hasOg)) return meta
  return hasOg ? { ...meta, title: null } : { ...meta, title: null, generic: true }
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

const DEFAULT_USER_AGENT = 'Mozilla/5.0 (compatible; LinkVaultBot/1.0)'
const CRAWLER_USER_AGENT = 'facebookexternalhit/1.1'

/** Fetches a page with the given user agent. `extracted` is null when the response is
 *  not OK, not HTML, or the request threw. */
async function fetchPage(
  url: string,
  userAgent: string,
): Promise<{ extracted: ExtractedMeta | null; rateLimited: boolean }> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      headers: { 'User-Agent': userAgent },
    })
    const rateLimited = res.status === 429
    if (!res.ok) return { extracted: null, rateLimited }
    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.includes('text/html')) return { extracted: null, rateLimited }
    return { extracted: extractMeta(await res.text(), url), rateLimited }
  } catch {
    // fetch failed — meta stays empty
    return { extracted: null, rateLimited: false }
  }
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
    const first = await fetchPage(url, DEFAULT_USER_AGENT)
    let chosen = first.extracted
    if (first.rateLimited) meta.rateLimited = true
    // Some sites (e.g. TikTok) serve an app shell with no og tags to unknown agents but
    // full og tags to link-preview crawlers, so a no-og page gets one crawler retry.
    if (chosen && !chosen.hasOg) {
      const retry = await fetchPage(url, CRAWLER_USER_AGENT)
      if (retry.rateLimited) meta.rateLimited = true
      if (retry.extracted?.hasOg) chosen = retry.extracted
    }
    if (chosen) Object.assign(meta, finalizeMeta(chosen, url))
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
