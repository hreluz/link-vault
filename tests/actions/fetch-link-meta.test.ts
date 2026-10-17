import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchLinkMeta } from '@/app/dashboard/link/actions'

function htmlResponse(html: string) {
  return {
    ok: true,
    headers: { get: () => 'text/html; charset=utf-8' },
    text: async () => html,
  }
}

function jsonResponse(body: unknown, ok = true, status = ok ? 200 : 404) {
  return { ok, status, json: async () => body }
}

function statusResponse(status: number) {
  return { ok: false, status, headers: { get: () => null }, text: async () => '', json: async () => null }
}

const notFoundResponse = statusResponse(404)

const YOUTUBE_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
const ARTICLE_URL = 'https://example.com/some-article'

const YOUTUBE_PAGE_HTML = `
  <html><head>
    <meta property="og:title" content="Scraped title (consent wall placeholder)" />
    <meta property="og:image" content="https://i.ytimg.com/vi/dQw4w9WgXcQ/scraped.jpg" />
  </head></html>
`

describe('fetchLinkMeta', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockReset()
    vi.stubEnv('YOUTUBE_API_KEY', 'test-api-key')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('uses oEmbed for title/thumbnail and the Data API for duration/description on YouTube URLs', async () => {
    mockFetch.mockImplementation(async (url: string) => {
      if (url.startsWith('https://www.youtube.com/oembed')) {
        return jsonResponse({ title: 'Rick Astley - Never Gonna Give You Up', thumbnail_url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg' })
      }
      if (url.startsWith('https://www.googleapis.com/youtube/v3/videos')) {
        return jsonResponse({ items: [{ contentDetails: { duration: 'PT3M33S' }, snippet: { description: 'The official video' } }] })
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })

    const meta = await fetchLinkMeta(YOUTUBE_URL)

    expect(meta.title).toBe('Rick Astley - Never Gonna Give You Up')
    expect(meta.image).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg')
    expect(meta.duration).toBe('3:33')
    expect(meta.description).toBe('The official video')
    expect(meta.rateLimited).toBeUndefined()
  })

  it('never fetches the raw youtube.com video page', async () => {
    mockFetch.mockImplementation(async (url: string) => {
      if (url === YOUTUBE_URL) return htmlResponse(YOUTUBE_PAGE_HTML)
      if (url.startsWith('https://www.youtube.com/oembed')) return jsonResponse(null, false)
      if (url.startsWith('https://www.googleapis.com/youtube/v3/videos')) return notFoundResponse
      throw new Error(`Unexpected fetch: ${url}`)
    })

    const meta = await fetchLinkMeta(YOUTUBE_URL)

    expect(mockFetch).not.toHaveBeenCalledWith(YOUTUBE_URL, expect.anything())
    expect(meta.title).toBeNull()
    expect(meta.image).toBeNull()
  })

  it('requests the snippet part from the Data API', async () => {
    mockFetch.mockImplementation(async (url: string) => {
      if (url.startsWith('https://www.youtube.com/oembed')) return jsonResponse({ title: 'T', thumbnail_url: null })
      if (url.startsWith('https://www.googleapis.com/youtube/v3/videos')) return jsonResponse({ items: [] })
      throw new Error(`Unexpected fetch: ${url}`)
    })

    await fetchLinkMeta(YOUTUBE_URL)

    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('part=contentDetails,snippet'), expect.anything())
  })

  it('sets rateLimited when YouTube oEmbed answers 429', async () => {
    mockFetch.mockImplementation(async (url: string) => {
      if (url.startsWith('https://www.youtube.com/oembed')) return statusResponse(429)
      if (url.startsWith('https://www.googleapis.com/youtube/v3/videos')) return jsonResponse({ items: [] })
      throw new Error(`Unexpected fetch: ${url}`)
    })

    const meta = await fetchLinkMeta(YOUTUBE_URL)

    expect(meta.rateLimited).toBe(true)
    expect(meta.title).toBeNull()
  })

  it('does not set rateLimited when the Data API answers 403 (quota)', async () => {
    mockFetch.mockImplementation(async (url: string) => {
      if (url.startsWith('https://www.youtube.com/oembed')) return jsonResponse({ title: 'T', thumbnail_url: null })
      if (url.startsWith('https://www.googleapis.com/youtube/v3/videos')) return statusResponse(403)
      throw new Error(`Unexpected fetch: ${url}`)
    })

    const meta = await fetchLinkMeta(YOUTUBE_URL)

    expect(meta.rateLimited).toBeUndefined()
    expect(meta.duration).toBeNull()
  })

  it('sets rateLimited when a page answers 429', async () => {
    mockFetch.mockImplementation(async (url: string) => {
      if (url === ARTICLE_URL) return statusResponse(429)
      throw new Error(`Unexpected fetch: ${url}`)
    })

    const meta = await fetchLinkMeta(ARTICLE_URL)

    expect(meta.rateLimited).toBe(true)
    expect(meta.title).toBeNull()
  })

  it('does not set rateLimited when a page answers 403', async () => {
    mockFetch.mockImplementation(async (url: string) => {
      if (url === ARTICLE_URL) return statusResponse(403)
      throw new Error(`Unexpected fetch: ${url}`)
    })

    const meta = await fetchLinkMeta(ARTICLE_URL)

    expect(meta.rateLimited).toBeUndefined()
    expect(meta.title).toBeNull()
  })

  it('never calls the oEmbed endpoint for non-YouTube URLs', async () => {
    mockFetch.mockImplementation(async (url: string) => {
      if (url === ARTICLE_URL) {
        return htmlResponse('<html><head><meta property="og:title" content="An article" /></head></html>')
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })

    const meta = await fetchLinkMeta(ARTICLE_URL)

    expect(meta.title).toBe('An article')
    expect(mockFetch).not.toHaveBeenCalledWith(expect.stringContaining('youtube.com/oembed'), expect.anything())
  })

  it('decodes HTML entities in og:title, og:description and og:image', async () => {
    const INSTAGRAM_URL = 'https://www.instagram.com/p/C0u8odWu7Pm/'
    mockFetch.mockImplementation(async (url: string) => {
      if (url === INSTAGRAM_URL) {
        return htmlResponse(`<html><head>
          <meta property="og:title" content="No Soy Normal Cerveceria on Instagram: &quot;&#x1f64b;&#x200d;&#x2642;&#xfe0f;Quien se suma #a&#xf1;onuevo&quot;" />
          <meta property="og:description" content="Tom &amp; Jerry &#39;s &lt;3" />
          <meta property="og:image" content="https://scontent.cdninstagram.com/v/pic.jpg?stp=a&amp;_nc_cat=104&amp;oe=6AC5" />
        </head></html>`)
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })

    const meta = await fetchLinkMeta(INSTAGRAM_URL)

    expect(meta.title).toBe('No Soy Normal Cerveceria on Instagram: "🙋‍♂️Quien se suma #añonuevo"')
    expect(meta.description).toBe("Tom & Jerry 's <3")
    expect(meta.image).toBe('https://scontent.cdninstagram.com/v/pic.jpg?stp=a&_nc_cat=104&oe=6AC5')
  })

  it('decodes double-encoded entities only once', async () => {
    mockFetch.mockImplementation(async (url: string) => {
      if (url === ARTICLE_URL) {
        return htmlResponse('<html><head><title>Say &amp;quot;hi&amp;quot;</title></head></html>')
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })

    const meta = await fetchLinkMeta(ARTICLE_URL)

    expect(meta.title).toBe('Say &quot;hi&quot;')
  })
})
