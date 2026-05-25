/**
 * Mi Panini — custom sticker spec.
 *
 * Pricing matches Pablo's spec: flat 200 MXN per card (R4 #3 default,
 * Replicate AI bg-remove + Panini frame composition).
 *
 * Card types map to STAR_RARITIES so the printed card uses the same
 * border/foil treatment as Stars catalog. Lets Pablo's print flow reuse
 * existing templates.
 */
import type { StarRarity } from './pricing'

export const MI_PANINI_PRICE_MXN = 200

export interface MiPaniniDraft {
  cardType: StarRarity        // BASE / BRONCE / PLATA / ORO frame
  playerName: string
  country: string             // 3-letter ISO code or display name
  stats: {
    pace: number              // 0-99
    shooting: number
    passing: number
    defending: number
  }
  photoUri: string | null     // local file:// before upload
  photoPublicUrl?: string     // set after Supabase upload
}

export const EMPTY_DRAFT: MiPaniniDraft = {
  cardType: 'ORO',
  playerName: '',
  country: 'MEX',
  stats: { pace: 80, shooting: 80, passing: 80, defending: 70 },
  photoUri: null,
}

/** SKU shape for the cart — same prefix scheme as Stars (MI-PANINI-<draftId>). */
export function miPaniniSku(draftId: string): string {
  return `MI-PANINI-${draftId}`
}

/** Random short draft ID for cart bookkeeping until the order is placed. */
export function newDraftId(): string {
  return Math.random().toString(36).slice(2, 10).toUpperCase()
}

/** Country quick list — top football nations for the dropdown. */
export const COUNTRY_OPTIONS: Array<{ code: string; label: string; flag: string }> = [
  { code: 'MEX', label: 'México',     flag: '🇲🇽' },
  { code: 'ARG', label: 'Argentina',  flag: '🇦🇷' },
  { code: 'BRA', label: 'Brasil',     flag: '🇧🇷' },
  { code: 'ESP', label: 'España',     flag: '🇪🇸' },
  { code: 'FRA', label: 'Francia',    flag: '🇫🇷' },
  { code: 'POR', label: 'Portugal',   flag: '🇵🇹' },
  { code: 'GER', label: 'Alemania',   flag: '🇩🇪' },
  { code: 'ENG', label: 'Inglaterra', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { code: 'ITA', label: 'Italia',     flag: '🇮🇹' },
  { code: 'NED', label: 'Países Bajos', flag: '🇳🇱' },
  { code: 'USA', label: 'USA',        flag: '🇺🇸' },
  { code: 'CAN', label: 'Canadá',     flag: '🇨🇦' },
  { code: 'COL', label: 'Colombia',   flag: '🇨🇴' },
  { code: 'URU', label: 'Uruguay',    flag: '🇺🇾' },
  { code: 'CHI', label: 'Chile',      flag: '🇨🇱' },
]
