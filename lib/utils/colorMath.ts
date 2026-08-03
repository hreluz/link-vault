function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function hexToLinearRgb(hex: string): { r: number; g: number; b: number } {
  const n = parseInt(hex.slice(1), 16)
  return {
    r: srgbToLinear(((n >> 16) & 255) / 255),
    g: srgbToLinear(((n >> 8) & 255) / 255),
    b: srgbToLinear((n & 255) / 255),
  }
}

function linearRgbToOklab({ r, g, b }: { r: number; g: number; b: number }) {
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b

  const l_ = Math.cbrt(l)
  const m_ = Math.cbrt(m)
  const s_ = Math.cbrt(s)

  return {
    L: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  }
}

/** Converts a 6-digit hex color to OKLCH (lightness 0-100, chroma, hue in degrees 0-360). */
export function hexToOklch(hex: string): { l: number; c: number; h: number } {
  const { L, a, b } = linearRgbToOklab(hexToLinearRgb(hex))
  const c = Math.sqrt(a * a + b * b)
  const h = (Math.atan2(b, a) * 180) / Math.PI
  return { l: L * 100, c, h: h < 0 ? h + 360 : h }
}
