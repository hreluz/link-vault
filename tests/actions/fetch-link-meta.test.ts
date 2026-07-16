import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchLinkMeta } from '@/app/dashboard/link/actions'

function htmlResponse(html: string) {
  return {
    ok: true,
    headers: { get: () => 'text/html; charset=utf-8' },
    text: async () => html,
  }
}

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: async () => body }
}

const notFoundResponse = { ok: false, headers: { get: () => null }, text: async () => '' }

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

  it('prefers oEmbed title/thumbnail over the scraped page for YouTube URLs', async () => {
    mockFetch.mockImplementation(async (url: string) => {
      if (url === YOUTUBE_URL) return htmlResponse(YOUTUBE_PAGE_HTML)
      if (url.startsWith('https://www.youtube.com/oembed')) {
        return jsonResponse({ title: 'Rick Astley - Never Gonna Give You Up', thumbnail_url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg' })
      }
      if (url.startsWith('https://www.googleapis.com/youtube/v3/videos')) {
        return jsonResponse({ items: [{ contentDetails: { duration: 'PT3M33S' } }] })
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })

    const meta = await fetchLinkMeta(YOUTUBE_URL)

    expect(meta.title).toBe('Rick Astley - Never Gonna Give You Up')
    expect(meta.image).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg')
    expect(meta.duration).toBe('3:33')
  })

  it('falls back to the scraped title/image when oEmbed fails', async () => {
    mockFetch.mockImplementation(async (url: string) => {
      if (url === YOUTUBE_URL) return htmlResponse(YOUTUBE_PAGE_HTML)
      if (url.startsWith('https://www.youtube.com/oembed')) return jsonResponse(null, false)
      if (url.startsWith('https://www.googleapis.com/youtube/v3/videos')) return notFoundResponse
      throw new Error(`Unexpected fetch: ${url}`)
    })

    const meta = await fetchLinkMeta(YOUTUBE_URL)

    expect(meta.title).toBe('Scraped title (consent wall placeholder)')
    expect(meta.image).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/scraped.jpg')
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
})
