/**
 * Stars section — 20 players Pablo curated for the special "Stars" album page.
 * Each player ships as 4 separate shop SKUs by rarity tier (Base / Bronce /
 * Plata / Oro). Album side: 20 sticker slots total, one per player, regardless
 * of which tier the user owns physically.
 *
 * Source: zonamundial-master-spec-EN.pdf, Section 6 (May 2026).
 */

export type StarTier = 'GOAT' | 'CRACK' | 'STAR'

export interface StarPlayer {
  slug: string         // unique key (e.g. 'messi', 'a-davies')
  name: string         // display name
  country: string      // 3-letter code matching TEAMS
  tier: StarTier
  albumSlot: number    // 1-20 — position in the Stars album section
}

// Official Panini spellings per Pablo (May 2026). May still tweak when
// physical album lands but these are the locked names for v1 launch.
export const STAR_PLAYERS: StarPlayer[] = [
  // GOAT (4)
  { slug: 'messi',      name: 'Messi',             country: 'ARG', tier: 'GOAT',  albumSlot: 1 },
  { slug: 'cristiano',  name: 'Cristiano Ronaldo', country: 'POR', tier: 'GOAT',  albumSlot: 2 },
  { slug: 'haaland',    name: 'Haaland',           country: 'NOR', tier: 'GOAT',  albumSlot: 3 },
  { slug: 'yamal',      name: 'Lamine Yamal',      country: 'ESP', tier: 'GOAT',  albumSlot: 4 },
  // CRACK (8)
  { slug: 'vinicius',   name: 'Vinicius Jr.',      country: 'BRA', tier: 'CRACK', albumSlot: 5 },
  { slug: 'modric',     name: 'Luka Modric',       country: 'CRO', tier: 'CRACK', albumSlot: 6 },
  { slug: 'salah',      name: 'Salah',             country: 'EGY', tier: 'CRACK', albumSlot: 7 },
  { slug: 'bellingham', name: 'Bellingham',        country: 'ENG', tier: 'CRACK', albumSlot: 8 },
  { slug: 'mbappe',     name: 'Mbappé',            country: 'FRA', tier: 'CRACK', albumSlot: 9 },
  { slug: 'hakimi',     name: 'Hakimi',            country: 'MAR', tier: 'CRACK', albumSlot: 10 },
  { slug: 'son',        name: 'Heung-min Son',     country: 'KOR', tier: 'CRACK', albumSlot: 11 },
  { slug: 'valverde',   name: 'Valverde',          country: 'URU', tier: 'CRACK', albumSlot: 12 },
  // STAR (8)
  { slug: 'doku',       name: 'Doku',              country: 'BEL', tier: 'STAR',  albumSlot: 13 },
  { slug: 'a-davies',   name: 'Alphonso Davies',   country: 'CAN', tier: 'STAR',  albumSlot: 14 },
  { slug: 'l-diaz',     name: 'Luis Díaz',         country: 'COL', tier: 'STAR',  albumSlot: 15 },
  { slug: 'caicedo',    name: 'Moisés Caicedo',    country: 'ECU', tier: 'STAR',  albumSlot: 16 },
  { slug: 'wirtz',      name: 'Florian Wirtz',     country: 'GER', tier: 'STAR',  albumSlot: 17 },
  { slug: 'r-jimenez',  name: 'Raúl Jiménez',      country: 'MEX', tier: 'STAR',  albumSlot: 18 },
  { slug: 'gakpo',      name: 'Cody Gakpo',        country: 'NED', tier: 'STAR',  albumSlot: 19 },
  { slug: 'pulisic',    name: 'Christian Pulisic', country: 'USA', tier: 'STAR',  albumSlot: 20 },
]
