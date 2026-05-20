import { ALBUM } from './data'
import type { AlbumState } from './album-store'

/**
 * Generate the exact share-text format Pablo specified for the "Compartir
 * repetidas" button. Only sections with at least one repetida (count ≥ 2)
 * appear. Sticker numbers are listed without the country prefix.
 *
 * Output example:
 *   Mi Álbum Mundial 26 - Lista
 *   USA · Méx · Can 26
 *
 *   Repetidas
 *   FWC 🏆: 1
 *   MEX 🇲🇽: 4, 11, 13
 *   ...
 *
 *   Descarga la app
 *   https://cromos26.app/descargar
 */
export const DOWNLOAD_URL = 'https://zona-mundial.vercel.app/descargar'

const FWC_DISPLAY_PREFIX: Record<string, string> = {
  'FWC-T': 'FWC 🏆',
  'FWC-W': 'FWC 🌎',
  'FWC-H': 'FWC 📜',
}

export function generateRepetidasShareText(album: AlbumState): string {
  const lines: string[] = ['Mi Álbum Mundial 26 - Lista', 'USA · Méx · Can 26', '', 'Repetidas']

  let anyRepetidas = false
  for (const group of ALBUM) {
    const state = album[group.id]
    if (!state) continue
    const repNumbers: number[] = []
    for (const sticker of group.stickers) {
      const count = state[sticker.n]?.owned ?? 0
      if (count >= 2) repNumbers.push(sticker.n)
    }
    if (repNumbers.length === 0) continue
    anyRepetidas = true
    const prefix = FWC_DISPLAY_PREFIX[group.prefix] ?? `${group.prefix} ${group.emoji}`
    lines.push(`${prefix}: ${repNumbers.join(', ')}`)
  }

  if (!anyRepetidas) {
    // Friendly fallback so the share text is never empty
    lines.push('(ninguna repetida todavía)')
  }

  lines.push('', 'Descarga la app', DOWNLOAD_URL)
  return lines.join('\n')
}
