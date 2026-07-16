'use server'

export type LinkMeta = {
  title: string | null
  description: string | null
  image: string | null
  duration: string | null
}

const NULL_META: LinkMeta = { title: null, description: null, image: null, duration: null }

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

async function fetchYouTubeOEmbed(url: string): Promise<{ title: string | null; image: string | null }> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
      { signal: AbortSignal.timeout(5000) },
    )
    if (!res.ok) return { title: null, image: null }
    const data = await res.json()
    return { title: data?.title ?? null, image: data?.thumbnail_url ?? null }
  } catch {
    return { title: null, image: null }
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

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LinkVaultBot/1.0)' },
    })
    if (res.ok) {
      const contentType = res.headers.get('content-type') ?? ''
      if (contentType.includes('text/html')) {
        const html = await res.text()
        Object.assign(meta, extractMeta(html, url))
      }
    }
  } catch {
    // og fetch failed — continue to YouTube API below
  }

  if (videoId) {
    // youtube.com's raw page is frequently served a bot/consent placeholder when
    // fetched from datacenter IPs (e.g. Vercel), stripping the og:title/og:image
    // tags above. oEmbed is an official, key-free endpoint meant for exactly this
    // and isn't subject to that treatment, so it takes priority when available.
    const oembed = await fetchYouTubeOEmbed(url)
    if (oembed.title) meta.title = oembed.title
    if (oembed.image) meta.image = oembed.image
  }

  const apiKey = process.env.YOUTUBE_API_KEY
  if (videoId && apiKey) {
    try {
      const ytRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=contentDetails&key=${apiKey}`,
        { signal: AbortSignal.timeout(5000) },
      )
      if (ytRes.ok) {
        const ytData = await ytRes.json()
        const isoDuration = ytData?.items?.[0]?.contentDetails?.duration
        if (isoDuration) meta.duration = parseIsoDuration(isoDuration)
      }
    } catch {
      // YouTube API failed — duration stays null
    }
  }

  return meta
}
