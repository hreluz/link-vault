import { hexToOklch } from './colorMath'

export type PresetAccent = 'indigo' | 'violet' | 'blue' | 'emerald' | 'rose' | 'amber' | 'teal'

export type AccentPresetMeta = { value: PresetAccent; label: string; swatchClass: string }

export const PRESET_ACCENTS: AccentPresetMeta[] = [
  { value: 'indigo', label: 'Indigo', swatchClass: 'bg-indigo-500' },
  { value: 'violet', label: 'Violet', swatchClass: 'bg-violet-500' },
  { value: 'blue', label: 'Blue', swatchClass: 'bg-blue-500' },
  { value: 'emerald', label: 'Emerald', swatchClass: 'bg-emerald-500' },
  { value: 'rose', label: 'Rose', swatchClass: 'bg-rose-500' },
  { value: 'amber', label: 'Amber', swatchClass: 'bg-amber-500' },
  { value: 'teal', label: 'Teal', swatchClass: 'bg-teal-500' },
]

const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/

export function isPresetAccent(value: string): value is PresetAccent {
  return PRESET_ACCENTS.some(p => p.value === value)
}

export function isValidAccent(value: string): boolean {
  return isPresetAccent(value) || HEX_PATTERN.test(value)
}

export const SHADE_KEYS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'] as const
export type ShadeKey = (typeof SHADE_KEYS)[number]

// Tailwind v4's own indigo ramp (node_modules/tailwindcss/theme.css), used as
// the "shape" every generated ramp clones: same per-shade lightness and
// relative chroma falloff, just re-hued to the user's chosen color. Cloning
// a real, already-accessible ramp is what keeps arbitrary custom colors from
// producing muddy or unreadable shades.
const INDIGO_RAMP: Record<ShadeKey, { l: number; c: number }> = {
  '50': { l: 96.2, c: 0.018 },
  '100': { l: 93, c: 0.034 },
  '200': { l: 87, c: 0.065 },
  '300': { l: 78.5, c: 0.115 },
  '400': { l: 67.3, c: 0.182 },
  '500': { l: 58.5, c: 0.233 },
  '600': { l: 51.1, c: 0.262 },
  '700': { l: 45.7, c: 0.24 },
  '800': { l: 39.8, c: 0.195 },
  '900': { l: 35.9, c: 0.144 },
}

function linearToSrgb(c: number): number {
  const clamped = Math.min(1, Math.max(0, c))
  return clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * clamped ** (1 / 2.4) - 0.055
}

function oklabToLinearRgb({ L, a, b }: { L: number; a: number; b: number }) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.291485548 * b

  const l = l_ ** 3
  const m = m_ ** 3
  const s = s_ ** 3

  return {
    r: 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    b: -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  }
}

function oklchToLinearRgb(l: number, c: number, h: number) {
  const hRad = (h * Math.PI) / 180
  return oklabToLinearRgb({ L: l / 100, a: c * Math.cos(hRad), b: c * Math.sin(hRad) })
}

function relativeLuminance({ r, g, b }: { r: number; g: number; b: number }) {
  const clamp = (v: number) => Math.min(1, Math.max(0, v))
  return 0.2126 * clamp(r) + 0.7152 * clamp(g) + 0.0722 * clamp(b)
}

function contrastRatio(l1: number, l2: number) {
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Derives a full 50-900 ramp from a single hex value by cloning indigo's own
 * per-shade lightness and relative chroma shape, keeping only the input's
 * hue (and an overall chroma-intensity scale) from the user's color.
 */
export function generateAccentRamp(hex: string): Record<ShadeKey, string> {
  const { c: inputChroma, h } = hexToOklch(hex)
  const chromaScale = Math.min(1.8, inputChroma / INDIGO_RAMP['600'].c)

  const ramp = {} as Record<ShadeKey, string>
  for (const shade of SHADE_KEYS) {
    const { l, c } = INDIGO_RAMP[shade]
    ramp[shade] = `oklch(${l}% ${(c * chromaScale).toFixed(4)} ${h.toFixed(2)})`
  }
  return ramp
}

/** True when the generated primary-600 has sufficient contrast for white button text (WCAG AA, 4.5:1). */
export function checkAccentContrast(hex: string): boolean {
  const { c, h } = hexToOklch(hex)
  const chromaScale = Math.min(1.8, c / INDIGO_RAMP['600'].c)
  const shade600 = INDIGO_RAMP['600']
  const rgb = oklchToLinearRgb(shade600.l, shade600.c * chromaScale, h)
  const ratio = contrastRatio(1, relativeLuminance(rgb))
  return ratio >= 4.5
}
