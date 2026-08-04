import { describe, it, expect } from 'vitest'
import {
  checkAccentContrast,
  generateAccentRamp,
  isPresetAccent,
  isValidAccent,
  SHADE_KEYS,
} from '@/lib/utils/accentRamp'

describe('isPresetAccent', () => {
  it('recognizes preset keys', () => {
    expect(isPresetAccent('indigo')).toBe(true)
    expect(isPresetAccent('teal')).toBe(true)
  })

  it('rejects hex values and unknown strings', () => {
    expect(isPresetAccent('#6366f1')).toBe(false)
    expect(isPresetAccent('cerulean')).toBe(false)
  })
})

describe('isValidAccent', () => {
  it('accepts presets and 6-digit hex codes', () => {
    expect(isValidAccent('violet')).toBe(true)
    expect(isValidAccent('#0d9488')).toBe(true)
    expect(isValidAccent('#ABCDEF')).toBe(true)
  })

  it('rejects malformed values', () => {
    expect(isValidAccent('not-a-color')).toBe(false)
    expect(isValidAccent('#fff')).toBe(false)
    expect(isValidAccent('#gggggg')).toBe(false)
  })
})

describe('generateAccentRamp', () => {
  it('returns all 10 shades as oklch() strings sharing the input hue', () => {
    const ramp = generateAccentRamp('#0d9488')
    expect(Object.keys(ramp).sort()).toEqual([...SHADE_KEYS].sort())

    const hues = SHADE_KEYS.map(shade => {
      const match = ramp[shade].match(/^oklch\([\d.]+% [\d.]+ ([\d.]+)\)$/)
      expect(match).not.toBeNull()
      return Number(match![1])
    })
    for (const h of hues) expect(h).toBeCloseTo(hues[0], 1)
  })

  it('gives lighter shades a higher lightness than darker shades', () => {
    const ramp = generateAccentRamp('#e11d48')
    const lightnessOf = (css: string) => Number(css.match(/^oklch\(([\d.]+)%/)![1])
    expect(lightnessOf(ramp['50'])).toBeGreaterThan(lightnessOf(ramp['500']))
    expect(lightnessOf(ramp['500'])).toBeGreaterThan(lightnessOf(ramp['900']))
  })
})

describe('checkAccentContrast', () => {
  // The generated 600 shade always inherits indigo-600's own lightness
  // (only hue/chroma come from the input), so contrast against white stays
  // just above the WCAG AA threshold for every sRGB-representable hex —
  // even a near-white or fully-saturated input, since the derived button
  // color is never actually that light. Pure green is the closest any real
  // hex gets to failing (~4.65:1, just above the 4.5:1 cutoff).
  it('passes even for a near-white custom input, since the derived 600 shade is not that light', () => {
    expect(checkAccentContrast('#fefce8')).toBe(true)
  })

  it('passes for the worst-case fully-saturated hue (pure green)', () => {
    expect(checkAccentContrast('#00ff00')).toBe(true)
  })

  it('passes comfortably for a typical mid-saturation custom color', () => {
    expect(checkAccentContrast('#0d9488')).toBe(true)
  })
})
