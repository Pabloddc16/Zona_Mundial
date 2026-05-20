const pad = (n: number) => String(n).padStart(2, '0')

export interface Product {
  id: string
  name: string
  price: number
  category: string
  description: string
  emoji: string
  image?: string
  gradient: [string, string]
  badge?: string
}

export const PRODUCTS: Product[] = [
  { id: 'CAJA-100', name: 'Box of 100 packs', price: 2500, category: 'sobres', description: 'Sealed box. 100 packs × 7 stickers each.', emoji: '📦', image: '/images/productos/caja-100-sobres.webp', gradient: ['#CE1126', '#8B0B1C'], badge: 'BEST VALUE' },
  { id: 'SOBRE-1', name: 'Single pack', price: 25, category: 'sobres', description: 'One pack with 7 random stickers.', emoji: '✉️', image: '/images/productos/sobre.webp', gradient: ['#006341', '#004a30'], badge: 'BEST SELLER' },
  { id: 'ALBUM-HARD', name: 'Hardcover album', price: 349, category: 'albumes', description: 'Collector edition, premium hardcover.', emoji: '📗', image: '/images/productos/album-hardcover.webp', gradient: ['#006341', '#FFD100'], badge: 'COLLECTOR' },
  { id: 'ALBUM-SOFT', name: 'Softcover album', price: 99, category: 'albumes', description: 'Standard softcover edition, same pages.', emoji: '📘', image: '/images/productos/album-softcover.webp', gradient: ['#006341', '#00815a'] },
  { id: 'SET-COCA', name: 'Coca-Cola set', price: 490, category: 'coca', description: 'Exclusive cards not found in regular packs.', emoji: '🥤', gradient: ['#CE1126', '#FFD100'], badge: 'SPECIAL EDITION' },
  { id: 'SOBRE-COCA', name: 'Coca-Cola pack', price: 40, category: 'coca', description: 'Exclusive pack with limited edition stickers.', emoji: '🎟️', gradient: ['#CE1126', '#006341'], badge: 'LIMITED' },
  { id: 'CARTA-COCA', name: 'Coca-Cola card', price: 40, category: 'coca', description: 'Single Coca-Cola holographic card.', emoji: '✨', gradient: ['#FFD100', '#CE1126'], badge: 'HOLOGRAPHIC' },
  { id: 'CARTA-SUELTA', name: 'Single sticker', price: 5, category: 'cartas', description: 'Single sticker to complete your album.', emoji: '🃏', gradient: ['#006341', '#FFD100'], badge: 'COMPLETE THE ALBUM' },
  { id: 'COLECCION', name: 'Complete collection', price: 3500, category: 'packs', description: 'Hardcover album + 140 packs. Express shipping.', emoji: '🏆', image: '/images/productos/combo.webp', gradient: ['#FFD100', '#006341'], badge: 'RECOMMENDED' },
  { id: 'JERSEY-MX-LOCAL', name: 'Mexico home jersey 26', price: 2199, category: 'jerseys', description: 'Mexico national team home jersey.', emoji: '🇲🇽', gradient: ['#006341', '#CE1126'], badge: 'OFFICIAL' },
  { id: 'JERSEY-MX-VISITA', name: 'Mexico away jersey 26', price: 2199, category: 'jerseys', description: 'Mexico national team away jersey.', emoji: '⚽', gradient: ['#FAF6EE', '#006341'], badge: 'OFFICIAL' },
  { id: 'JERSEY-ARG', name: 'Argentina jersey 26', price: 2299, category: 'jerseys', description: 'Argentina national team jersey.', emoji: '🇦🇷', gradient: ['#6FA8DC', '#FFFFFF'] },
  { id: 'JERSEY-BRA', name: 'Brazil jersey 26', price: 2299, category: 'jerseys', description: 'Brazil national team yellow jersey.', emoji: '🇧🇷', gradient: ['#FFD100', '#006341'] },
  { id: 'BALON-OFICIAL', name: 'Official match ball 26', price: 3499, category: 'balones', description: 'Adidas size 5 Quality Pro.', emoji: '⚽', gradient: ['#CE1126', '#FFD100'], badge: 'QUALITY PRO' },
  { id: 'BALON-REPLICA', name: 'Replica ball 26', price: 899, category: 'balones', description: 'Official replica.', emoji: '🥎', gradient: ['#006341', '#FFD100'] },
  { id: 'COPA-REPLICA-MINI', name: 'Trophy mini replica', price: 499, category: 'trofeos', description: '15 cm height.', emoji: '🏆', gradient: ['#FFD100', '#C19800'], badge: 'COLLECTIBLE' },
  { id: 'COPA-REPLICA-FULL', name: 'Trophy 1:1 replica', price: 3999, category: 'trofeos', description: '36.8 cm. Collector edition.', emoji: '🏆', gradient: ['#FFD100', '#B27D00'], badge: 'LIMITED EDITION' },
  { id: 'GORRA-MX', name: 'Mexico cap (official)', price: 599, category: 'accesorios', description: 'Embroidered cap, Mexico national team.', emoji: '🧢', gradient: ['#006341', '#CE1126'] },
  { id: 'BUFANDA-MX', name: 'Mexico scarf', price: 399, category: 'accesorios', description: 'Tricolor knit scarf, 2026 edition.', emoji: '🧣', gradient: ['#CE1126', '#006341'] },
  { id: 'LLAVERO-PACK', name: 'Keychain pack (5 teams)', price: 249, category: 'accesorios', description: '5 keychains from various national teams.', emoji: '🗝️', gradient: ['#FFD100', '#006341'] },
  { id: 'POSTER-MASCOTAS', name: 'Mascot poster 26', price: 149, category: 'accesorios', description: 'A2 poster of the official mascots.', emoji: '🖼️', gradient: ['#FFD100', '#CE1126'] },
]

export const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'packs', label: 'Packs' },
  { id: 'sobres', label: 'Sticker packs' },
  { id: 'cartas', label: 'Cards' },
  { id: 'albumes', label: 'Albums' },
  { id: 'coca', label: 'Coca-Cola' },
  { id: 'jerseys', label: 'Jerseys' },
  { id: 'balones', label: 'Balls' },
  { id: 'trofeos', label: 'Trophies' },
  { id: 'accesorios', label: 'Accessories' },
]

/**
 * 48 confirmed/likely qualifier nations for the 2026 World Cup. The exact
 * roster is finalized after the inter-confederation playoffs (March 2026);
 * this list reflects the most likely participants based on confederation
 * spots + recent form. Pablo can hand-edit later when Panini publishes
 * the official checklist.
 */
const TEAMS = [
  // Hosts (3)
  { code: 'MEX', name: 'Mexico', flag: '🇲🇽', group: 'Hosts' },
  { code: 'USA', name: 'United States', flag: '🇺🇸', group: 'Hosts' },
  { code: 'CAN', name: 'Canada', flag: '🇨🇦', group: 'Hosts' },
  // South America (6)
  { code: 'ARG', name: 'Argentina', flag: '🇦🇷', group: 'South America' },
  { code: 'BRA', name: 'Brazil', flag: '🇧🇷', group: 'South America' },
  { code: 'URU', name: 'Uruguay', flag: '🇺🇾', group: 'South America' },
  { code: 'COL', name: 'Colombia', flag: '🇨🇴', group: 'South America' },
  { code: 'ECU', name: 'Ecuador', flag: '🇪🇨', group: 'South America' },
  { code: 'PAR', name: 'Paraguay', flag: '🇵🇾', group: 'South America' },
  // Europe (16)
  { code: 'ESP', name: 'Spain', flag: '🇪🇸', group: 'Europe' },
  { code: 'FRA', name: 'France', flag: '🇫🇷', group: 'Europe' },
  { code: 'ENG', name: 'England', flag: '🇬🇧', group: 'Europe' },
  { code: 'GER', name: 'Germany', flag: '🇩🇪', group: 'Europe' },
  { code: 'ITA', name: 'Italy', flag: '🇮🇹', group: 'Europe' },
  { code: 'POR', name: 'Portugal', flag: '🇵🇹', group: 'Europe' },
  { code: 'NED', name: 'Netherlands', flag: '🇳🇱', group: 'Europe' },
  { code: 'BEL', name: 'Belgium', flag: '🇧🇪', group: 'Europe' },
  { code: 'CRO', name: 'Croatia', flag: '🇭🇷', group: 'Europe' },
  { code: 'SUI', name: 'Switzerland', flag: '🇨🇭', group: 'Europe' },
  { code: 'DEN', name: 'Denmark', flag: '🇩🇰', group: 'Europe' },
  { code: 'POL', name: 'Poland', flag: '🇵🇱', group: 'Europe' },
  { code: 'AUT', name: 'Austria', flag: '🇦🇹', group: 'Europe' },
  { code: 'SRB', name: 'Serbia', flag: '🇷🇸', group: 'Europe' },
  { code: 'NOR', name: 'Norway', flag: '🇳🇴', group: 'Europe' },
  { code: 'TUR', name: 'Türkiye', flag: '🇹🇷', group: 'Europe' },
  // Asia (8)
  { code: 'JPN', name: 'Japan', flag: '🇯🇵', group: 'Asia' },
  { code: 'KOR', name: 'South Korea', flag: '🇰🇷', group: 'Asia' },
  { code: 'IRN', name: 'Iran', flag: '🇮🇷', group: 'Asia' },
  { code: 'KSA', name: 'Saudi Arabia', flag: '🇸🇦', group: 'Asia' },
  { code: 'AUS', name: 'Australia', flag: '🇦🇺', group: 'Asia' },
  { code: 'UAE', name: 'UAE', flag: '🇦🇪', group: 'Asia' },
  { code: 'IRQ', name: 'Iraq', flag: '🇮🇶', group: 'Asia' },
  { code: 'QAT', name: 'Qatar', flag: '🇶🇦', group: 'Asia' },
  // Africa (9)
  { code: 'MAR', name: 'Morocco', flag: '🇲🇦', group: 'Africa' },
  { code: 'SEN', name: 'Senegal', flag: '🇸🇳', group: 'Africa' },
  { code: 'EGY', name: 'Egypt', flag: '🇪🇬', group: 'Africa' },
  { code: 'NGA', name: 'Nigeria', flag: '🇳🇬', group: 'Africa' },
  { code: 'ALG', name: 'Algeria', flag: '🇩🇿', group: 'Africa' },
  { code: 'TUN', name: 'Tunisia', flag: '🇹🇳', group: 'Africa' },
  { code: 'CMR', name: 'Cameroon', flag: '🇨🇲', group: 'Africa' },
  { code: 'GHA', name: 'Ghana', flag: '🇬🇭', group: 'Africa' },
  { code: 'CIV', name: 'Ivory Coast', flag: '🇨🇮', group: 'Africa' },
  // Concacaf (3)
  { code: 'CRC', name: 'Costa Rica', flag: '🇨🇷', group: 'Concacaf' },
  { code: 'PAN', name: 'Panama', flag: '🇵🇦', group: 'Concacaf' },
  { code: 'JAM', name: 'Jamaica', flag: '🇯🇲', group: 'Concacaf' },
  // Oceania (1)
  { code: 'NZL', name: 'New Zealand', flag: '🇳🇿', group: 'Oceania' },
  // Playoff winners (2)
  { code: 'PO1', name: 'Playoff Winner 1', flag: '⚽', group: 'Playoffs' },
  { code: 'PO2', name: 'Playoff Winner 2', flag: '⚽', group: 'Playoffs' },
]

export const PRICE_BY_TIER = { comun: 5, media: 15, dificil: 30, legend: 60, coca: 25 } as const
export type StickerTier = keyof typeof PRICE_BY_TIER

/**
 * Visual rarity. Drives the sticker badge appearance in the Album.
 *   common  — cream + amber number (the default unfilled look)
 *   bronze  — copper border + bronze number (Legends tier 2)
 *   silver  — silver border + chrome number (Legends tier 3)
 *   gold    — gold border + ★ icon       (Legends tier 4)
 *   foil    — rainbow gradient border + ✦  (crests, FWC Specials)
 *   special — red border + RARE tape       (Coca-Cola promo, host extras)
 */
export type Rarity = 'common' | 'bronze' | 'silver' | 'gold' | 'foil' | 'special'

export function stickerType(i: number) { return i === 1 ? 'logo' : i === 2 ? 'team' : 'player' }
export function tierFor(type: string, groupKind: string, groupPrefix: string): StickerTier {
  if (groupKind === 'legend') return 'legend'
  if (groupKind === 'coca') return 'coca'
  if (groupKind === 'special' && groupPrefix === 'LEY') return 'dificil'
  if (type === 'logo') return 'dificil'
  if (type === 'team' || groupKind === 'special') return 'media'
  return 'comun'
}

export interface Sticker {
  n: number
  code: string
  label: string
  type: string
  tier: StickerTier
  price: number
  rarity?: Rarity
  player?: number   // 1-20 for Legends grouping (4 stickers per player)
}

export interface AlbumGroup {
  id: string
  prefix: string
  name: string
  subtitle: string
  emoji: string
  kind: 'special' | 'team' | 'legend' | 'coca'
  stickers: Sticker[]
}

function stickersTeam(prefix: string): Sticker[] {
  return Array.from({ length: 18 }, (_, i) => {
    const n = i + 1
    const type = stickerType(n)
    const tier = tierFor(type, 'team', prefix)
    const isCrest = n === 1
    return {
      n,
      code: prefix + pad(n),
      label: isCrest ? 'Crest' : n === 2 ? 'Team photo' : `Player ${n - 2}`,
      type,
      tier,
      price: PRICE_BY_TIER[tier],
      rarity: isCrest ? ('foil' as const) : ('common' as const),
    }
  })
}

const LEGEND_TIERS: { suffix: string; rarity: Rarity }[] = [
  { suffix: 'B', rarity: 'common' },   // Base
  { suffix: 'R', rarity: 'bronze' },   // Bronze
  { suffix: 'S', rarity: 'silver' },   // Silver
  { suffix: 'G', rarity: 'gold' },     // Gold
]

function stickersLegends(): Sticker[] {
  const out: Sticker[] = []
  for (let p = 1; p <= 20; p++) {
    LEGEND_TIERS.forEach((t, ti) => {
      const n = (p - 1) * 4 + ti + 1
      const tierLabel = ['Base', 'Bronze', 'Silver', 'Gold'][ti]
      out.push({
        n,
        code: `LEG${pad(p)}${t.suffix}`,
        label: `Legend ${pad(p)} · ${tierLabel}`,
        type: 'legend',
        tier: 'legend',
        price: PRICE_BY_TIER.legend * (ti + 1),  // gold tier 4× base
        rarity: t.rarity,
        player: p,
      })
    })
  }
  return out
}

function stickersCocaCola(): Sticker[] {
  return Array.from({ length: 24 }, (_, i) => {
    const n = i + 1
    return {
      n,
      code: `CC${pad(n)}`,
      label: `Coca-Cola ${pad(n)}`,
      type: 'coca',
      tier: 'coca',
      price: PRICE_BY_TIER.coca,
      rarity: 'special' as const,
    }
  })
}

const FWC_SPECIALS_BASE = [
  { id: 'MAS', fullId: 'MASCOTAS', name: 'FWC Mascots',  emoji: '🦅', count: 8 },
  { id: 'TRO', fullId: 'TROFEO',   name: 'FWC Balls',    emoji: '🏆', count: 6 },
  { id: 'EST', fullId: 'ESTADIOS', name: 'FWC Stadiums', emoji: '🏟️', count: 12 },
]

export const ALBUM: AlbumGroup[] = [
  // 1. FWC special pages (intro / mascots / balls / stadiums / history)
  ...FWC_SPECIALS_BASE.map((s) => ({
    id: s.fullId,
    prefix: s.id,
    name: s.name,
    subtitle: 'Special section',
    emoji: s.emoji,
    kind: 'special' as const,
    stickers: Array.from({ length: s.count }, (_, i) => {
      const tier = tierFor('special', 'special', s.id)
      return {
        n: i + 1,
        code: s.id + pad(i + 1),
        label: `${s.name.replace('FWC ', '')} ${i + 1}`,
        type: 'special',
        tier,
        price: PRICE_BY_TIER[tier],
        rarity: 'foil' as const,
      }
    }),
  })),

  // 2. Legends — 20 players × 4 tiers (Base / Bronze / Silver / Gold)
  {
    id: 'LEGENDS',
    prefix: 'LEG',
    name: 'FWC Legends',
    subtitle: '20 icons · 4 tiers each',
    emoji: '⭐',
    kind: 'legend',
    stickers: stickersLegends(),
  },

  // 3. Teams — 48 × 18 = 864
  ...TEAMS.map((t) => ({
    id: 'TEAM-' + t.code,
    prefix: t.code,
    name: t.name,
    subtitle: t.group,
    emoji: t.flag,
    kind: 'team' as const,
    stickers: stickersTeam(t.code),
  })),

  // 4. Coca-Cola promo (Mexico region exclusive)
  {
    id: 'COCACOLA',
    prefix: 'CC',
    name: 'Coca-Cola Promo',
    subtitle: 'Mexico exclusive',
    emoji: '🥤',
    kind: 'coca',
    stickers: stickersCocaCola(),
  },
]

export const TOTAL_STICKERS = ALBUM.reduce((sum, g) => sum + g.stickers.length, 0)

/* Rarity counts so Stats screen can render "Foils 0/35", etc. */
export const RARITY_TOTALS = ALBUM.reduce<Record<Rarity, number>>(
  (m, g) => {
    g.stickers.forEach((s) => {
      const r = s.rarity ?? 'common'
      m[r] = (m[r] ?? 0) + 1
    })
    return m
  },
  { common: 0, bronze: 0, silver: 0, gold: 0, foil: 0, special: 0 },
)

export const PREFIX_MAP = ALBUM.reduce<Record<string, string>>((m, g) => { m[g.prefix] = g.id; return m }, {})

export function productById(id: string) { return PRODUCTS.find((p) => p.id === id) }
export function groupById(id: string) { return ALBUM.find((g) => g.id === id) }

export const fmt = (n: number) => '$' + Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })
