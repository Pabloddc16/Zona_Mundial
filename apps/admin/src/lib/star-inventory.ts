/**
 * Initial Stars inventory (player × rarity) from Pablo's master spec, Section 7.
 * Counts represent physical stock units. Run-time values come from the
 * `star_player_stock` table; this file seeds first-run values only.
 */

export const STAR_TIERS = ['GOAT', 'CRACK', 'STAR'] as const
export type StarTier = (typeof STAR_TIERS)[number]

export const STAR_RARITIES = ['BASE', 'BRONCE', 'PLATA', 'ORO'] as const
export type StarRarity = (typeof STAR_RARITIES)[number]

export const STAR_PRICING: Record<StarTier, Record<StarRarity, number>> = {
  GOAT:  { BASE: 500, BRONCE: 800, PLATA: 5000, ORO: 10000 },
  CRACK: { BASE: 300, BRONCE: 500, PLATA: 3000, ORO: 4000 },
  STAR:  { BASE: 100, BRONCE: 200, PLATA: 1500, ORO: 2500 },
}

export interface StarPlayer {
  slug: string
  name: string
  country: string
  tier: StarTier
}

export const STAR_PLAYERS: StarPlayer[] = [
  { slug: 'messi',      name: 'Messi',      country: 'ARG', tier: 'GOAT' },
  { slug: 'cristiano',  name: 'Cristiano',  country: 'POR', tier: 'GOAT' },
  { slug: 'haaland',    name: 'Haaland',    country: 'NOR', tier: 'GOAT' },
  { slug: 'yamal',      name: 'Yamal',      country: 'ESP', tier: 'GOAT' },
  { slug: 'vinicius',   name: 'Vinicius',   country: 'BRA', tier: 'CRACK' },
  { slug: 'modric',     name: 'Modric',     country: 'CRO', tier: 'CRACK' },
  { slug: 'salah',      name: 'Salah',      country: 'EGY', tier: 'CRACK' },
  { slug: 'bellingham', name: 'Bellingham', country: 'ENG', tier: 'CRACK' },
  { slug: 'mbappe',     name: 'Mbappé',     country: 'FRA', tier: 'CRACK' },
  { slug: 'hakimi',     name: 'Hakimi',     country: 'MAR', tier: 'CRACK' },
  { slug: 'son',        name: 'Son',        country: 'KOR', tier: 'CRACK' },
  { slug: 'valverde',   name: 'Valverde',   country: 'URU', tier: 'CRACK' },
  { slug: 'doku',       name: 'Doku',       country: 'BEL', tier: 'STAR' },
  { slug: 'a-davies',   name: 'A. Davies',  country: 'CAN', tier: 'STAR' },
  { slug: 'l-diaz',     name: 'L. Díaz',    country: 'COL', tier: 'STAR' },
  { slug: 'caicedo',    name: 'Caicedo',    country: 'ECU', tier: 'STAR' },
  { slug: 'wirtz',      name: 'Wirtz',      country: 'GER', tier: 'STAR' },
  { slug: 'r-jimenez',  name: 'R. Jiménez', country: 'MEX', tier: 'STAR' },
  { slug: 'gakpo',      name: 'Gakpo',      country: 'NED', tier: 'STAR' },
  { slug: 'pulisic',    name: 'Pulisic',    country: 'USA', tier: 'STAR' },
]

// [BASE, BRONCE, PLATA, ORO]
export const INITIAL_STOCK: Record<string, [number, number, number, number]> = {
  messi:      [9, 5, 3, 2],
  cristiano:  [2, 2, 3, 1],
  haaland:    [10, 4, 2, 1],
  yamal:      [13, 12, 1, 1],
  vinicius:   [10, 7, 2, 1],
  modric:     [17, 7, 1, 2],
  salah:      [8, 5, 1, 2],
  bellingham: [14, 4, 1, 1],
  mbappe:     [8, 7, 6, 1],
  hakimi:     [9, 5, 1, 2],
  son:        [11, 8, 2, 1],
  valverde:   [10, 7, 3, 0],
  doku:       [13, 5, 1, 1],
  'a-davies': [14, 6, 4, 0],
  'l-diaz':   [14, 1, 3, 2],
  caicedo:    [9, 2, 2, 0],
  wirtz:      [10, 4, 2, 1],
  'r-jimenez': [16, 10, 0, 0],
  gakpo:      [13, 11, 2, 1],
  pulisic:    [11, 5, 7, 0],
}

export function stockValueFor(slug: string, tier: StarTier): number {
  const counts = INITIAL_STOCK[slug] ?? [0, 0, 0, 0]
  return STAR_RARITIES.reduce((sum, r, i) => sum + (counts[i] ?? 0) * STAR_PRICING[tier][r], 0)
}
