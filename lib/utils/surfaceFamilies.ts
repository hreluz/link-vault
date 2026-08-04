import { hexToOklch } from './colorMath'

export type PresetSurfaceFamily = 'slate' | 'gray' | 'zinc' | 'neutral' | 'stone'

export type SurfaceFamilyMeta = { value: PresetSurfaceFamily; label: string; swatchClass: string }

// Swatch previews use the same hand-authored oklch values as the
// [data-surface] presets in app/globals.css (500 shade) rather than
// Tailwind's native gray/zinc/neutral/stone classes -- those are too close
// in hue/chroma to preview as distinct options. Each swatch must show its
// own family regardless of which one is currently active, so these use
// Tailwind v4's arbitrary-value syntax instead of a token class.
export const SURFACE_FAMILIES: SurfaceFamilyMeta[] = [
  { value: 'slate', label: 'Slate', swatchClass: 'bg-[oklch(55.4%_0.048_255)]' },
  { value: 'gray', label: 'Gray', swatchClass: 'bg-[oklch(55.4%_0.036_150)]' },
  { value: 'zinc', label: 'Zinc', swatchClass: 'bg-[oklch(55.4%_0.0384_330)]' },
  { value: 'neutral', label: 'Neutral', swatchClass: 'bg-[oklch(55.4%_0_0)]' },
  { value: 'stone', label: 'Stone', swatchClass: 'bg-[oklch(55.4%_0.0408_55)]' },
]

const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/

export function isSurfaceFamily(value: string): value is PresetSurfaceFamily {
  return SURFACE_FAMILIES.some(f => f.value === value)
}

export function isValidSurfaceFamily(value: string): boolean {
  return isSurfaceFamily(value) || HEX_PATTERN.test(value)
}

export const SURFACE_SHADE_KEYS = [
  '50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950',
] as const
export type SurfaceShadeKey = (typeof SURFACE_SHADE_KEYS)[number]

// Same per-shade lightness/chroma curve baked into the [data-surface] preset
// blocks in app/globals.css (the "slate" preset uses this at full scale) --
// background-only shades (50-300, card) carry more chroma so page/border
// tinting reads clearly, while the dual-purpose 700-950 shades (also used as
// light-mode heading/label text) stay more restrained so text never looks
// visibly colored.
const SURFACE_CURVE: Record<SurfaceShadeKey, { l: number; c: number }> = {
  '50': { l: 98.4, c: 0.014 },
  '100': { l: 96.8, c: 0.02 },
  '200': { l: 92.9, c: 0.028 },
  '300': { l: 86.9, c: 0.036 },
  '400': { l: 70.4, c: 0.042 },
  '500': { l: 55.4, c: 0.048 },
  '600': { l: 44.6, c: 0.044 },
  '700': { l: 37.2, c: 0.032 },
  '800': { l: 27.9, c: 0.028 },
  '900': { l: 20.8, c: 0.026 },
  '950': { l: 12.9, c: 0.024 },
}
const CARD_L = 98.9
const CARD_C = 0.01

/**
 * Derives a full 50-950 ramp (plus a `card` shade) from a single hex value,
 * taking ONLY its hue -- chroma always follows the fixed SURFACE_CURVE above,
 * regardless of how saturated the input is. Unlike generateAccentRamp, this
 * never scales with the input's own chroma: surface-* shades double as
 * body/heading text color, so an oversaturated pick must not be able to turn
 * text into visibly-colored text. This keeps any custom hue looking like a
 * tasteful neutral tint, never a real "color".
 */
export function generateSurfaceRamp(hex: string): Record<SurfaceShadeKey, string> & { card: string } {
  const { h } = hexToOklch(hex)

  const ramp = {} as Record<SurfaceShadeKey, string> & { card: string }
  for (const shade of SURFACE_SHADE_KEYS) {
    const { l, c } = SURFACE_CURVE[shade]
    ramp[shade] = `oklch(${l}% ${c.toFixed(4)} ${h.toFixed(2)})`
  }
  ramp.card = `oklch(${CARD_L}% ${CARD_C.toFixed(4)} ${h.toFixed(2)})`
  return ramp
}
