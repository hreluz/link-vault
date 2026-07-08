import { describe, expect, it } from 'vitest'
import { buildBookmarkletHref, buildCaptureResumeUrl } from '@/lib/bookmarklet'

describe('buildBookmarkletHref', () => {
  it('embeds the given origin as a JSON string literal', () => {
    const href = buildBookmarkletHref('https://linkvault.example')
    expect(href).toContain(JSON.stringify('https://linkvault.example'))
  })

  it('returns a self-invoking javascript: URI', () => {
    const href = buildBookmarkletHref('https://linkvault.example')
    expect(href.startsWith('javascript:(function(){')).toBe(true)
    expect(href.endsWith('})()')).toBe(true)
  })

  it('reads the current page url and title via location/document at click time', () => {
    const href = buildBookmarkletHref('https://linkvault.example')
    expect(href).toContain('encodeURIComponent(location.href)')
    expect(href).toContain('encodeURIComponent(document.title)')
  })

  it('targets the /dashboard route with an add=1 flag', () => {
    const href = buildBookmarkletHref('https://linkvault.example')
    expect(href).toContain("/dashboard?add=1&url='")
  })
})

describe('buildCaptureResumeUrl', () => {
  it('returns a bare /dashboard when there is no captured url', () => {
    expect(buildCaptureResumeUrl(null, null)).toBe('/dashboard')
  })

  it('builds an add=1 deep link with the url and title encoded', () => {
    const result = buildCaptureResumeUrl('https://example.com/a b', 'A & B')
    expect(result).toBe('/dashboard?add=1&url=https%3A%2F%2Fexample.com%2Fa%20b&title=A%20%26%20B')
  })

  it('defaults title to an empty string when only a url is present', () => {
    const result = buildCaptureResumeUrl('https://example.com', null)
    expect(result).toBe('/dashboard?add=1&url=https%3A%2F%2Fexample.com&title=')
  })
})
