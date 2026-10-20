import { describe, it, expect } from 'vitest'
import { titleFromUrl } from '@/lib/utils/urlTitle'

describe('titleFromUrl', () => {
  it('uses the path without slashes and drops the query string', () => {
    expect(titleFromUrl('https://www.instagram.com/reel/DPwciDeD86l/?utm_source=ig')).toBe('reel/DPwciDeD86l')
  })

  it('keeps slashes and dots inside the path', () => {
    expect(titleFromUrl('https://github.com/vercel/next.js')).toBe('vercel/next.js')
  })

  it('decodes percent-encoding and drops the hash', () => {
    expect(titleFromUrl('https://en.wikipedia.org/wiki/Caf%C3%A9#History')).toBe('wiki/Café')
  })

  it('keeps the raw path when the percent-encoding is malformed', () => {
    expect(titleFromUrl('https://example.com/a%ZZb')).toBe('a%ZZb')
  })

  it('falls back to the hostname when the path is only a slash', () => {
    expect(titleFromUrl('https://example.com/')).toBe('example.com')
  })

  it('falls back to the hostname as-is when there is no path', () => {
    expect(titleFromUrl('https://www.example.com')).toBe('www.example.com')
  })

  it('returns the input when it is not a URL', () => {
    expect(titleFromUrl('not a url')).toBe('not a url')
  })

  it('falls back to the hostname when the path is only slashes', () => {
    expect(titleFromUrl('https://example.com///')).toBe('example.com')
  })

  it('trims a trailing slash from a nested path', () => {
    expect(titleFromUrl('https://example.com/a/b/')).toBe('a/b')
  })

  it('returns a path longer than 30 characters in full', () => {
    const path = 'a/very/long/path/that/goes/on/and/on'
    expect(titleFromUrl(`https://example.com/${path}`)).toBe(path)
  })

  it('ignores surrounding whitespace', () => {
    expect(titleFromUrl('  https://example.com/path  ')).toBe('path')
  })
})
