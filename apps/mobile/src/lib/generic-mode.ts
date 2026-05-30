/**
 * Generic-mode label switcher for App Store IP review (Guideline 5.2.1).
 *
 * Apple rejected Builds 12 + 17 for "content that resembles FIFA" — they
 * consider tracking a FIFA-licensed product, even with disclaimers, as
 * derivative use. The only path through without a license is to make the
 * iOS build look like a generic numbered card collection.
 *
 * Triggered via env: `EXPO_PUBLIC_GENERIC_LABELS=1` (set in eas.json's
 * iOS production profile). When ON:
 *   - 48 album sections render as "Equipo 01..48" with auto-generated
 *     hue-shifted gradients + rotating geometric icons (one per section)
 *   - 20 Star players render as "Estrella 01..20" with star glyph
 *   - Country names + flags + real player names hidden everywhere
 *
 * Real names + country codes stay in the data files. Only the render
 * layer swaps via these helpers. Android + dev builds default OFF so
 * customers see the full UX. Rarity tiers + brand palette unchanged.
 */
const ENABLED = process.env['EXPO_PUBLIC_GENERIC_LABELS'] === '1'

export function isGenericMode(): boolean {
  return ENABLED
}

/** "Equipo 01..48" — zero-padded so labels sort lexicographically + look uniform. */
export function genericSectionLabel(index: number): string {
  return `Equipo ${String(index + 1).padStart(2, '0')}`
}

/** "Estrella 01..20" — same convention as sections for visual rhythm. */
export function genericPlayerLabel(index: number): string {
  return `Estrella ${String(index + 1).padStart(2, '0')}`
}

/** Single visible glyph in place of country flag. */
export function genericCountryLabel(): string {
  return '★'
}

/**
 * Section glyph rotator — 12 unicode shape characters cycled across 48
 * sections. Renders cleanly inside Text components alongside the section
 * label without needing an Ionicons component swap.
 */
const SECTION_GLYPHS = ['◆', '▲', '●', '★', '✦', '◇', '▼', '■', '◯', '❖', '✧', '⬢']
export function genericSectionGlyph(index: number): string {
  return SECTION_GLYPHS[index % SECTION_GLYPHS.length]!
}

/**
 * Hue-shift gradients — 48 sections divided across the color wheel so each
 * card tile has a distinct saturated background. HSL→hex via lightweight
 * inline conversion (Expo RN has no chroma library by default).
 */
export function genericSectionGradient(index: number): [string, string] {
  const hue = Math.round((index * 360) / 48)
  // Two-stop gradient: brighter foreground + darker companion for depth.
  return [hslHex(hue, 55, 45), hslHex(hue, 50, 30)]
}

function hslHex(h: number, s: number, l: number): string {
  s /= 100
  l /= 100
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const c = l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
    return Math.round(255 * c).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}
