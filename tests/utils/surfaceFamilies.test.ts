import { describe, it, expect } from 'vitest'
import {
  generateSurfaceRamp,
  isSurfaceFamily,
  isValidSurfaceFamily,
  SURFACE_SHADE_KEYS,
} from '@/lib/utils/surfaceFamilies'

describe('isSurfaceFamily', () => {
  it('recognizes preset keys', () => {
    expect(isSurfaceFamily('slate')).toBe(true)
    expect(isSurfaceFamily('stone')).toBe(true)
  })

  it('rejects hex values and unknown strings', () => {
    expect(isSurfaceFamily('#71717a')).toBe(false)
    expect(isSurfaceFamily('charcoal')).toBe(false)
  })
})

describe('isValidSurfaceFamily', () => {
  it('accepts presets and 6-digit hex codes', () => {
    expect(isValidSurfaceFamily('gray')).toBe(true)
    expect(isValidSurfaceFamily('#0d9488')).toBe(true)
    expect(isValidSurfaceFamily('#ABCDEF')).toBe(true)
  })

  it('rejects malformed values', () => {
    expect(isValidSurfaceFamily('not-a-color')).toBe(false)
    expect(isValidSurfaceFamily('#fff')).toBe(false)
  })
})

describe('generateSurfaceRamp', () => {
  it('returns all 11 shades plus card, sharing the input hue', () => {
    const ramp = generateSurfaceRamp('#0d9488')
    for (const shade of SURFACE_SHADE_KEYS) {
      expect(ramp[shade]).toMatch(/^oklch\([\d.]+% [\d.]+ [\d.]+\)$/)
    }
    expect(ramp.card).toMatch(/^oklch\([\d.]+% [\d.]+ [\d.]+\)$/)

    const hueOf = (css: string) => Number(css.match(/^oklch\([\d.]+% [\d.]+ ([\d.]+)\)$/)![1])
    const hues = SURFACE_SHADE_KEYS.map(shade => hueOf(ramp[shade]))
    for (const h of hues) expect(h).toBeCloseTo(hues[0], 1)
    expect(hueOf(ramp.card)).toBeCloseTo(hues[0], 1)
  })

  it('keeps chroma fixed regardless of how saturated the input is', () => {
    const mutedRamp = generateSurfaceRamp('#8a8a8a')
    const vividRamp = generateSurfaceRamp('#ff0000')
    const chromaOf = (css: string) => css.match(/^oklch\([\d.]+% ([\d.]+) [\d.]+\)$/)![1]

    for (const shade of SURFACE_SHADE_KEYS) {
      expect(chromaOf(mutedRamp[shade])).toBe(chromaOf(vividRamp[shade]))
    }
  })

  it('gives lighter shades a higher lightness than darker shades', () => {
    const ramp = generateSurfaceRamp('#e11d48')
    const lightnessOf = (css: string) => Number(css.match(/^oklch\(([\d.]+)%/)![1])
    expect(lightnessOf(ramp['50'])).toBeGreaterThan(lightnessOf(ramp['500']))
    expect(lightnessOf(ramp['500'])).toBeGreaterThan(lightnessOf(ramp['950']))
  })
})
