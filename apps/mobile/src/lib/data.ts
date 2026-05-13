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
  { id: 'albumes', label: 'Albums' },
  { id: 'coca', label: 'Coca-Cola' },
  { id: 'jerseys', label: 'Jerseys' },
  { id: 'balones', label: 'Balls' },
  { id: 'trofeos', label: 'Trophies' },
  { id: 'accesorios', label: 'Accessories' },
]

const TEAMS = [
  { code: 'MEX', name: 'Mexico', flag: '🇲🇽', group: 'Hosts' },
  { code: 'USA', name: 'United States', flag: '🇺🇸', group: 'Hosts' },
  { code: 'CAN', name: 'Canada', flag: '🇨🇦', group: 'Hosts' },
  { code: 'ARG', name: 'Argentina', flag: '🇦🇷', group: 'South America' },
  { code: 'BRA', name: 'Brazil', flag: '🇧🇷', group: 'South America' },
  { code: 'URU', name: 'Uruguay', flag: '🇺🇾', group: 'South America' },
  { code: 'COL', name: 'Colombia', flag: '🇨🇴', group: 'South America' },
  { code: 'ECU', name: 'Ecuador', flag: '🇪🇨', group: 'South America' },
  { code: 'CHI', name: 'Chile', flag: '🇨🇱', group: 'South America' },
  { code: 'PAR', name: 'Paraguay', flag: '🇵🇾', group: 'South America' },
  { code: 'ESP', name: 'Spain', flag: '🇪🇸', group: 'Europe' },
  { code: 'FRA', name: 'France', flag: '🇫🇷', group: 'Europe' },
  { code: 'ENG', name: 'England', flag: '🇬🇧', group: 'Europe' },
  { code: 'GER', name: 'Germany', flag: '🇩🇪', group: 'Europe' },
  { code: 'ITA', name: 'Italy', flag: '🇮🇹', group: 'Europe' },
  { code: 'POR', name: 'Portugal', flag: '🇵🇹', group: 'Europe' },
  { code: 'NED', name: 'Netherlands', flag: '🇳🇱', group: 'Europe' },
  { code: 'BEL', name: 'Belgium', flag: '🇧🇪', group: 'Europe' },
  { code: 'CRO', name: 'Croatia', flag: '🇭🇷', group: 'Europe' },
  { code: 'JPN', name: 'Japan', flag: '🇯🇵', group: 'Asia' },
  { code: 'KOR', name: 'South Korea', flag: '🇰🇷', group: 'Asia' },
  { code: 'MAR', name: 'Morocco', flag: '🇲🇦', group: 'Africa' },
  { code: 'SEN', name: 'Senegal', flag: '🇸🇳', group: 'Africa' },
  { code: 'CRC', name: 'Costa Rica', flag: '🇨🇷', group: 'Concacaf' },
]

const SPECIALS = [
  { id: 'MAS', fullId: 'MASCOTAS', name: 'FWC Specials', emoji: '🦅', count: 8 },
  { id: 'TRO', fullId: 'TROFEO', name: 'FWC Balls', emoji: '🏆', count: 6 },
  { id: 'EST', fullId: 'ESTADIOS', name: 'FWC Countries', emoji: '🏟️', count: 12 },
  { id: 'LEY', fullId: 'LEYENDAS', name: 'FWC History', emoji: '👑', count: 18 },
]

export const PRICE_BY_TIER = { comun: 5, media: 15, dificil: 30 } as const
export type StickerTier = keyof typeof PRICE_BY_TIER

export function stickerType(i: number) { return i === 1 ? 'logo' : i === 2 ? 'team' : 'player' }
export function tierFor(type: string, groupKind: string, groupPrefix: string): StickerTier {
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
}

export interface AlbumGroup {
  id: string
  prefix: string
  name: string
  subtitle: string
  emoji: string
  kind: 'special' | 'team'
  stickers: Sticker[]
}

function stickersTeam(prefix: string): Sticker[] {
  return Array.from({ length: 18 }, (_, i) => {
    const n = i + 1
    const type = stickerType(n)
    const tier = tierFor(type, 'team', prefix)
    return { n, code: prefix + pad(n), label: n === 1 ? 'Crest' : n === 2 ? 'Team photo' : `Player ${n - 2}`, type, tier, price: PRICE_BY_TIER[tier] }
  })
}

export const ALBUM: AlbumGroup[] = [
  ...SPECIALS.map((s) => ({
    id: s.fullId,
    prefix: s.id,
    name: s.name,
    subtitle: 'Special section',
    emoji: s.emoji,
    kind: 'special' as const,
    stickers: Array.from({ length: s.count }, (_, i) => {
      const tier = tierFor('special', 'special', s.id)
      return { n: i + 1, code: s.id + pad(i + 1), label: `Sticker ${i + 1}`, type: 'special', tier, price: PRICE_BY_TIER[tier] }
    }),
  })),
  ...TEAMS.map((t) => ({
    id: 'TEAM-' + t.code,
    prefix: t.code,
    name: t.name,
    subtitle: t.group,
    emoji: t.flag,
    kind: 'team' as const,
    stickers: stickersTeam(t.code),
  })),
]

export const TOTAL_STICKERS = 500
export const PREFIX_MAP = ALBUM.reduce<Record<string, string>>((m, g) => { m[g.prefix] = g.id; return m }, {})

export function productById(id: string) { return PRODUCTS.find((p) => p.id === id) }
export function groupById(id: string) { return ALBUM.find((g) => g.id === id) }

export const fmt = (n: number) => '$' + Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })
