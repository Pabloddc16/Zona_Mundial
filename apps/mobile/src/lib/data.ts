import { STAR_PLAYERS } from './star-players'

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

// Pablo's official 7-product order (May 2026):
//   1. Álbum pasta blanda   2. Sobre   3. Álbum pasta dura
//   4. Caja   5. Set completo   6. Sobre Coca-Cola   7. Set completo Coca-Cola
export const PRODUCTS: Product[] = [
  { id: 'ALBUM-SOFT', name: 'Álbum pasta blanda', price: 99, category: 'albumes', description: 'Official Mundial 26 sticker album, soft cover.', emoji: '📘', image: '/products/album-soft.webp', gradient: ['#006341', '#00815a'], badge: 'OFICIAL' },
  { id: 'SOBRE-1', name: 'Sobre (1 paquete)', price: 25, category: 'sobres', description: 'One sealed pack with 7 random stickers.', emoji: '✉️', image: '/products/pack-single.webp', gradient: ['#006341', '#004a30'], badge: 'BEST SELLER' },
  { id: 'ALBUM-HARD', name: 'Álbum pasta dura', price: 349, category: 'albumes', description: 'Collector edition hardcover album.', emoji: '📗', image: '/products/album-hard.webp', gradient: ['#006341', '#FFD100'], badge: 'COLLECTOR' },
  { id: 'CAJA-100', name: 'Caja de sobres', price: 2500, category: 'sobres', description: 'Sealed box of 100 packs × 7 stickers each.', emoji: '📦', image: '/products/box-100.webp', gradient: ['#CE1126', '#8B0B1C'], badge: 'BEST VALUE' },
  { id: 'SET-COMPLETO', name: 'Set completo', price: 3500, category: 'packs', description: 'Hardcover album + every pack you need to finish it.', emoji: '🏆', image: '/products/set-complete.webp', gradient: ['#FFD100', '#006341'], badge: 'COMPLETE THE ALBUM' },
  { id: 'SOBRE-COCA', name: 'Sobre Coca-Cola', price: 40, category: 'coca', description: '2 Panini stickers + 1 exclusive Coca-Cola sticker.', emoji: '🥤', image: '/products/coca-pack.webp', gradient: ['#CE1126', '#FFD100'], badge: 'LIMITED' },
  { id: 'SET-COCA', name: 'Set completo Coca-Cola', price: 490, category: 'coca', description: 'Complete Coca-Cola promo set in one bundle.', emoji: '🎁', image: '/products/coca-set.webp', gradient: ['#CE1126', '#FFD100'], badge: 'SPECIAL EDITION' },
  // Carry-overs (kept for catalog completeness, shown after the main 7)
  { id: 'CARTA-COCA', name: 'Coca-Cola card', price: 40, category: 'coca', description: 'Single Coca-Cola holographic card.', emoji: '✨', gradient: ['#FFD100', '#CE1126'], badge: 'HOLOGRAPHIC' },
  { id: 'CARTA-SUELTA', name: 'Single sticker', price: 5, category: 'cartas', description: 'Single sticker to complete your album.', emoji: '🃏', gradient: ['#006341', '#FFD100'] },
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
 * Pablo's official "USA · Méx · Can 26" album country roster — 42 codes
 * confirmed, 6 more to land once playoff bracket finalizes. Order matters
 * (per Pablo's PDF spec): kept in the exact sequence he provided.
 */
const TEAMS = [
  { code: 'MEX', name: 'México',           flag: '🇲🇽', group: 'Concacaf' },
  { code: 'RSA', name: 'Sudáfrica',        flag: '🇿🇦', group: 'Africa' },
  { code: 'KOR', name: 'Corea del Sur',    flag: '🇰🇷', group: 'Asia' },
  { code: 'CAN', name: 'Canadá',           flag: '🇨🇦', group: 'Concacaf' },
  { code: 'QAT', name: 'Qatar',            flag: '🇶🇦', group: 'Asia' },
  { code: 'SUI', name: 'Suiza',            flag: '🇨🇭', group: 'Europe' },
  { code: 'BRA', name: 'Brasil',           flag: '🇧🇷', group: 'South America' },
  { code: 'MAR', name: 'Marruecos',        flag: '🇲🇦', group: 'Africa' },
  { code: 'HAI', name: 'Haití',            flag: '🇭🇹', group: 'Concacaf' },
  { code: 'SCO', name: 'Escocia',          flag: '🏴', group: 'Europe' },
  { code: 'USA', name: 'United States',    flag: '🇺🇸', group: 'Concacaf' },
  { code: 'PAR', name: 'Paraguay',         flag: '🇵🇾', group: 'South America' },
  { code: 'AUS', name: 'Australia',        flag: '🇦🇺', group: 'Asia' },
  { code: 'GER', name: 'Alemania',         flag: '🇩🇪', group: 'Europe' },
  { code: 'CUW', name: 'Curazao',          flag: '🇨🇼', group: 'Concacaf' },
  { code: 'CIV', name: 'Costa de Marfil',  flag: '🇨🇮', group: 'Africa' },
  { code: 'ECU', name: 'Ecuador',          flag: '🇪🇨', group: 'South America' },
  { code: 'NED', name: 'Países Bajos',     flag: '🇳🇱', group: 'Europe' },
  { code: 'JPN', name: 'Japón',            flag: '🇯🇵', group: 'Asia' },
  { code: 'TUN', name: 'Túnez',            flag: '🇹🇳', group: 'Africa' },
  { code: 'BEL', name: 'Bélgica',          flag: '🇧🇪', group: 'Europe' },
  { code: 'EGY', name: 'Egipto',           flag: '🇪🇬', group: 'Africa' },
  { code: 'IRN', name: 'Irán',             flag: '🇮🇷', group: 'Asia' },
  { code: 'NZL', name: 'Nueva Zelanda',    flag: '🇳🇿', group: 'Oceania' },
  { code: 'ESP', name: 'España',           flag: '🇪🇸', group: 'Europe' },
  { code: 'CPV', name: 'Cabo Verde',       flag: '🇨🇻', group: 'Africa' },
  { code: 'KSA', name: 'Arabia Saudí',     flag: '🇸🇦', group: 'Asia' },
  { code: 'URU', name: 'Uruguay',          flag: '🇺🇾', group: 'South America' },
  { code: 'FRA', name: 'Francia',          flag: '🇫🇷', group: 'Europe' },
  { code: 'SEN', name: 'Senegal',          flag: '🇸🇳', group: 'Africa' },
  { code: 'NOR', name: 'Noruega',          flag: '🇳🇴', group: 'Europe' },
  { code: 'ARG', name: 'Argentina',        flag: '🇦🇷', group: 'South America' },
  { code: 'ALG', name: 'Argelia',          flag: '🇩🇿', group: 'Africa' },
  { code: 'AUT', name: 'Austria',          flag: '🇦🇹', group: 'Europe' },
  { code: 'JOR', name: 'Jordania',         flag: '🇯🇴', group: 'Asia' },
  { code: 'POR', name: 'Portugal',         flag: '🇵🇹', group: 'Europe' },
  { code: 'UZB', name: 'Uzbekistán',       flag: '🇺🇿', group: 'Asia' },
  { code: 'COL', name: 'Colombia',         flag: '🇨🇴', group: 'South America' },
  { code: 'ENG', name: 'Inglaterra',       flag: '🏴', group: 'Europe' },
  { code: 'CRO', name: 'Croacia',          flag: '🇭🇷', group: 'Europe' },
  { code: 'GHA', name: 'Ghana',            flag: '🇬🇭', group: 'Africa' },
  { code: 'PAN', name: 'Panamá',           flag: '🇵🇦', group: 'Concacaf' },
  // 6 newly qualified (Pablo's spec, May 2026):
  { code: 'BIH', name: 'Bosnia',           flag: '🇧🇦', group: 'Europe' },
  { code: 'SWE', name: 'Suecia',           flag: '🇸🇪', group: 'Europe' },
  { code: 'TUR', name: 'Türkiye',          flag: '🇹🇷', group: 'Europe' },
  { code: 'CZE', name: 'República Checa',  flag: '🇨🇿', group: 'Europe' },
  { code: 'IRQ', name: 'Iraq',             flag: '🇮🇶', group: 'Asia' },
  { code: 'COD', name: 'RD del Congo',     flag: '🇨🇩', group: 'Africa' },
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

// Pablo's spec: 20 stickers per country section (a few may end up 18-22
// once the physical album is published — adjust per-section if needed).
const STICKERS_PER_TEAM = 20

function stickersTeam(prefix: string): Sticker[] {
  return Array.from({ length: STICKERS_PER_TEAM }, (_, i) => {
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

// 20 star-player slots — one per player. Tier/rarity tracked separately
// in the shop SKU catalog (see star-players.ts + pricing.ts).
function stickersStars(): Sticker[] {
  return STAR_PLAYERS
    .slice()
    .sort((a, b) => a.albumSlot - b.albumSlot)
    .map((p) => {
      const rarity: Rarity =
        p.tier === 'GOAT' ? 'gold'
        : p.tier === 'CRACK' ? 'silver'
        : 'bronze'
      return {
        n: p.albumSlot,
        code: 'STAR' + pad(p.albumSlot),
        label: `${p.name} (${p.country})`,
        type: 'star',
        tier: 'legend',
        price: PRICE_BY_TIER.legend,
        rarity,
        player: p.albumSlot,
      }
    })
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

// Pablo's official FWC special sections (3 — replaces our prior 4).
// Counts per section are placeholders until Pablo confirms with physical album.
const FWC_SPECIALS_BASE = [
  { id: 'FWC-T', fullId: 'FWC-TROFEO',  name: 'FWC Trofeo',  emoji: '🏆', count: 10 },
  { id: 'FWC-W', fullId: 'FWC-MUNDO',   name: 'FWC Mundo',   emoji: '🌎', count: 10 },
  { id: 'FWC-H', fullId: 'FWC-HISTORIA', name: 'FWC Historia', emoji: '📜', count: 20 },
]

export const ALBUM: AlbumGroup[] = [
  // 1. FWC special pages (Trofeo, Mundo, Historia)
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

  // 2. Teams — 42 × 20 (6 more pending playoff results)
  ...TEAMS.map((t) => ({
    id: 'TEAM-' + t.code,
    prefix: t.code,
    name: t.name,
    subtitle: t.group,
    emoji: t.flag,
    kind: 'team' as const,
    stickers: stickersTeam(t.code),
  })),

  // 3. Stars — 20 player slots (GOAT/CRACK/STAR tiers)
  {
    id: 'STARS',
    prefix: 'STAR',
    name: 'Stars',
    subtitle: '20 jugadores · GOAT / CRACK / STAR',
    emoji: '⭐',
    kind: 'legend',
    stickers: stickersStars(),
  },

  // 4. Coca-Cola promo (Mexico exclusive). Count placeholder until Pablo
  //    confirms with the brand kit.
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
