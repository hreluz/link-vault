import { describe, expect, it } from 'vitest'
import { buildBookmarkletHref } from '@/lib/bookmarklet'

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
