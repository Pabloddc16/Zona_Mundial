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
  { id: 'CAJA-100', name: 'Caja 100 sobres', price: 2500, category: 'sobres', description: 'Caja sellada Panini oficial. 100 sobres × 7 estampas.', emoji: '📦', image: '/images/productos/caja-100-sobres.webp', gradient: ['#CE1126', '#8B0B1C'], badge: 'MEJOR VOLUMEN' },
  { id: 'SOBRE-1', name: 'Sobre individual', price: 25, category: 'sobres', description: 'Un sobre oficial con 7 estampas aleatorias.', emoji: '✉️', image: '/images/productos/sobre.webp', gradient: ['#006341', '#004a30'], badge: 'MÁS VENDIDO' },
  { id: 'ALBUM-HARD', name: 'Álbum pasta dura', price: 349, category: 'albumes', description: 'Edición coleccionista México 2026, tapa dura premium.', emoji: '📗', image: '/images/productos/album-hardcover.webp', gradient: ['#006341', '#FFD100'], badge: 'COLECCIONISTA' },
  { id: 'ALBUM-SOFT', name: 'Álbum pasta blanda', price: 99, category: 'albumes', description: 'Edición estándar softcover, mismas páginas.', emoji: '📘', image: '/images/productos/album-softcover.webp', gradient: ['#006341', '#00815a'] },
  { id: 'SET-COCA', name: 'Set Coca-Cola', price: 490, category: 'coca', description: 'Cartas exclusivas que no vienen en sobres regulares.', emoji: '🥤', gradient: ['#CE1126', '#FFD100'], badge: 'EDICIÓN ESPECIAL' },
  { id: 'SOBRE-COCA', name: 'Sobre Coca-Cola', price: 40, category: 'coca', description: 'Sobre exclusivo con estampas edición limitada.', emoji: '🎟️', gradient: ['#CE1126', '#006341'], badge: 'LIMITED' },
  { id: 'CARTA-COCA', name: 'Carta Coca-Cola', price: 40, category: 'coca', description: 'Carta holográfica Coca-Cola individual.', emoji: '✨', gradient: ['#FFD100', '#CE1126'], badge: 'HOLOGRÁFICA' },
  { id: 'CARTA-SUELTA', name: 'Carta suelta Panini', price: 5, category: 'cartas', description: 'Carta individual para completar tu álbum.', emoji: '🃏', gradient: ['#006341', '#FFD100'], badge: 'COMPLETA ÁLBUM' },
  { id: 'COLECCION', name: 'Colección completa', price: 3500, category: 'packs', description: 'Álbum pasta dura + 140 sobres. Envío express.', emoji: '🏆', image: '/images/productos/combo.webp', gradient: ['#FFD100', '#006341'], badge: 'RECOMENDADO' },
  { id: 'JERSEY-MX-LOCAL', name: 'Jersey México Local 26', price: 2199, category: 'jerseys', description: 'Jersey oficial selección mexicana local Mundial 2026.', emoji: '🇲🇽', gradient: ['#006341', '#CE1126'], badge: 'OFICIAL' },
  { id: 'JERSEY-MX-VISITA', name: 'Jersey México Visita 26', price: 2199, category: 'jerseys', description: 'Jersey oficial selección mexicana visita Mundial 2026.', emoji: '⚽', gradient: ['#FAF6EE', '#006341'], badge: 'OFICIAL' },
  { id: 'JERSEY-ARG', name: 'Jersey Argentina 26', price: 2299, category: 'jerseys', description: 'Jersey oficial Argentina Mundial 2026.', emoji: '🇦🇷', gradient: ['#6FA8DC', '#FFFFFF'] },
  { id: 'JERSEY-BRA', name: 'Jersey Brasil 26', price: 2299, category: 'jerseys', description: 'Jersey amarillo Brasil Mundial 2026.', emoji: '🇧🇷', gradient: ['#FFD100', '#006341'] },
  { id: 'BALON-OFICIAL', name: 'Balón oficial Mundial 26', price: 3499, category: 'balones', description: 'Adidas tamaño 5 FIFA Quality Pro.', emoji: '⚽', gradient: ['#CE1126', '#FFD100'], badge: 'FIFA QUALITY' },
  { id: 'BALON-REPLICA', name: 'Balón réplica Mundial 26', price: 899, category: 'balones', description: 'Réplica oficial.', emoji: '🥎', gradient: ['#006341', '#FFD100'] },
  { id: 'COPA-REPLICA-MINI', name: 'Copa FIFA réplica mini', price: 499, category: 'trofeos', description: 'Altura 15 cm.', emoji: '🏆', gradient: ['#FFD100', '#C19800'], badge: 'COLECCIONABLE' },
  { id: 'COPA-REPLICA-FULL', name: 'Copa FIFA réplica 1:1', price: 3999, category: 'trofeos', description: '36.8 cm. Edición coleccionista.', emoji: '🏆', gradient: ['#FFD100', '#B27D00'], badge: 'EDICIÓN LIMITADA' },
  { id: 'GORRA-MX', name: 'Gorra México Oficial', price: 599, category: 'accesorios', description: 'Gorra bordada oficial selección mexicana.', emoji: '🧢', gradient: ['#006341', '#CE1126'] },
  { id: 'BUFANDA-MX', name: 'Bufanda México', price: 399, category: 'accesorios', description: 'Bufanda tejida tricolor edición Mundial 2026.', emoji: '🧣', gradient: ['#CE1126', '#006341'] },
  { id: 'LLAVERO-PACK', name: 'Pack 5 llaveros selecciones', price: 249, category: 'accesorios', description: '5 llaveros selecciones varias.', emoji: '🗝️', gradient: ['#FFD100', '#006341'] },
  { id: 'POSTER-MASCOTAS', name: 'Poster oficial mascotas 26', price: 149, category: 'accesorios', description: 'A2 de las mascotas Maple, Zayu y Clutch.', emoji: '🖼️', gradient: ['#FFD100', '#CE1126'] },
]

export const CATEGORIES = [
  { id: 'all', label: 'Todos' },
  { id: 'packs', label: 'Packs' },
  { id: 'sobres', label: 'Sobres' },
  { id: 'albumes', label: 'Álbumes' },
  { id: 'coca', label: 'Coca-Cola' },
  { id: 'jerseys', label: 'Jerseys' },
  { id: 'balones', label: 'Balones' },
  { id: 'trofeos', label: 'Trofeos' },
  { id: 'accesorios', label: 'Accesorios' },
]

const TEAMS = [
  { code: 'MEX', name: 'México', flag: '🇲🇽', group: 'Anfitriones' },
  { code: 'USA', name: 'Estados Unidos', flag: '🇺🇸', group: 'Anfitriones' },
  { code: 'CAN', name: 'Canadá', flag: '🇨🇦', group: 'Anfitriones' },
  { code: 'ARG', name: 'Argentina', flag: '🇦🇷', group: 'Sudamérica' },
  { code: 'BRA', name: 'Brasil', flag: '🇧🇷', group: 'Sudamérica' },
  { code: 'URU', name: 'Uruguay', flag: '🇺🇾', group: 'Sudamérica' },
  { code: 'COL', name: 'Colombia', flag: '🇨🇴', group: 'Sudamérica' },
  { code: 'ECU', name: 'Ecuador', flag: '🇪🇨', group: 'Sudamérica' },
  { code: 'CHI', name: 'Chile', flag: '🇨🇱', group: 'Sudamérica' },
  { code: 'PAR', name: 'Paraguay', flag: '🇵🇾', group: 'Sudamérica' },
  { code: 'ESP', name: 'España', flag: '🇪🇸', group: 'Europa' },
  { code: 'FRA', name: 'Francia', flag: '🇫🇷', group: 'Europa' },
  { code: 'ENG', name: 'Inglaterra', flag: '🇬🇧', group: 'Europa' },
  { code: 'GER', name: 'Alemania', flag: '🇩🇪', group: 'Europa' },
  { code: 'ITA', name: 'Italia', flag: '🇮🇹', group: 'Europa' },
  { code: 'POR', name: 'Portugal', flag: '🇵🇹', group: 'Europa' },
  { code: 'NED', name: 'Países Bajos', flag: '🇳🇱', group: 'Europa' },
  { code: 'BEL', name: 'Bélgica', flag: '🇧🇪', group: 'Europa' },
  { code: 'CRO', name: 'Croacia', flag: '🇭🇷', group: 'Europa' },
  { code: 'JPN', name: 'Japón', flag: '🇯🇵', group: 'Asia' },
  { code: 'KOR', name: 'Corea del Sur', flag: '🇰🇷', group: 'Asia' },
  { code: 'MAR', name: 'Marruecos', flag: '🇲🇦', group: 'África' },
  { code: 'SEN', name: 'Senegal', flag: '🇸🇳', group: 'África' },
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
    return { n, code: prefix + pad(n), label: n === 1 ? 'Escudo' : n === 2 ? 'Foto equipo' : `Jugador ${n - 2}`, type, tier, price: PRICE_BY_TIER[tier] }
  })
}

export const ALBUM: AlbumGroup[] = [
  ...SPECIALS.map((s) => ({
    id: s.fullId,
    prefix: s.id,
    name: s.name,
    subtitle: 'Sección especial',
    emoji: s.emoji,
    kind: 'special' as const,
    stickers: Array.from({ length: s.count }, (_, i) => {
      const tier = tierFor('special', 'special', s.id)
      return { n: i + 1, code: s.id + pad(i + 1), label: `Estampa ${i + 1}`, type: 'special', tier, price: PRICE_BY_TIER[tier] }
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

export const fmt = (n: number) => '$' + Number(n || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })
