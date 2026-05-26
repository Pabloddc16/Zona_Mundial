/**
 * Tienda — full redesign per Pablo's PDF spec (May 2026).
 * Hierarchy: 4 hero sections, vertical scroll, no subtabs.
 *   1. Mi Panini (custom sticker photo, $200)
 *   2. Extra Stickers (rarity-filtered catalog)
 *   3. Llena tu álbum (dynamic — reacts to user's album state)
 *   4. Productos del Mundial (category carousel + product grid)
 *
 * Everything related to delivery / payment lives in /checkout now —
 * Tienda is for discovery + cart only.
 */
import { useCallback, useMemo, useState } from 'react'
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, TextInput } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useCartStore } from '@/lib/cart-store'
import { useProductsStore } from '@/lib/products-store'
import { useAlbumStore, albumStats } from '@/lib/album-store'
import { ALBUM, TOTAL_STICKERS, fmt } from '@/lib/data'
import { COLORS, SPACING, RADIUS, FONT, SHADOW } from '@/lib/theme'

const PRODUCT_CATEGORIES = [
  { id: 'all',          label: 'All',           icon: 'apps-outline' as const,         emoji: '🛒' },
  { id: 'albumes',      label: 'Albums',        icon: 'book-outline' as const,         emoji: '📘' },
  { id: 'sobres',       label: 'Packs',         icon: 'mail-outline' as const,         emoji: '✉️' },
  { id: 'packs',        label: 'Sets',          icon: 'gift-outline' as const,         emoji: '🎁' },
  { id: 'coca',         label: 'Coca-Cola',     icon: 'wine-outline' as const,         emoji: '🥤' },
  { id: 'jerseys',      label: 'Jerseys',       icon: 'shirt-outline' as const,        emoji: '👕' },
  { id: 'balones',      label: 'Balls',         icon: 'football-outline' as const,     emoji: '⚽' },
  { id: 'trofeos',      label: 'Trophies',      icon: 'trophy-outline' as const,       emoji: '🏆' },
  { id: 'accesorios',   label: 'Accessories',   icon: 'pricetag-outline' as const,     emoji: '🧢' },
]

const MY_PANINI_PRICE = 200

const API = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:4000'

export default function TiendaScreen() {
  const cart = useCartStore((s) => s.cart)
  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0)
  const products = useProductsStore((s) => s.products)
  const fetchProducts = useProductsStore((s) => s.fetch)
  const album = useAlbumStore((s) => s.album)
  const stats = albumStats(album)
  const [searchQuery, setSearchQuery] = useState('')

  // Live-filter the product grid by search query. Case-insensitive partial
  // match on name + description. Empty query = show everything.
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return products
    return products.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      (p.description?.toLowerCase().includes(q) ?? false) ||
      (p.category?.toLowerCase().includes(q) ?? false),
    )
  }, [products, searchQuery])

  // Refetch products every time Tienda gains focus so admin-uploaded
  // image_url changes propagate without an app restart.
  useFocusEffect(
    useCallback(() => {
      fetchProducts(API).catch(() => {})
    }, [fetchProducts]),
  )

  const completionPct = Math.round((stats.owned / TOTAL_STICKERS) * 100)
  const missing = TOTAL_STICKERS - stats.owned

  // Estimate cost to complete: avg sticker $5 from PRICE_BY_TIER.comun
  const estCostToFinish = useMemo(() => {
    let total = 0
    for (const g of ALBUM) {
      const gs = album[g.id] ?? {}
      for (const st of g.stickers) {
        if ((gs[st.n]?.owned ?? 0) === 0) total += st.price
      }
    }
    return total
  }, [album])

  return (
    <SafeAreaView style={s.safe}>
      {/* Header — Tienda / Mundial 26 Shop, cart top-right, NO settings */}
      <View style={s.header}>
        <View>
          <Text style={s.titleSmall}>Store</Text>
          <Text style={s.titleBig}>Mundial 26 Shop</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/carrito')} style={s.cartBtn} hitSlop={8}>
          <Ionicons name="cart-outline" size={22} color={COLORS.paper} />
          {cartCount > 0 && (
            <View style={s.cartBadge}>
              <Text style={s.cartBadgeText}>{cartCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Search bar — filters product grid live by name/description/category */}
      <View style={s.searchWrap}>
        <Ionicons name="search" size={16} color={COLORS.textMuted} />
        <TextInput
          style={s.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Buscar productos…"
          placeholderTextColor={COLORS.textFaint}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {/* 1. MI PANINI — hero with camera card mock */}
        <TouchableOpacity
          onPress={() => router.push('/shop/my-panini')}
          activeOpacity={0.9}
          style={[s.hero, s.heroPanini]}
        >
          <View style={s.heroBody}>
            <View style={s.heroText}>
              <Text style={s.heroEyebrow}>NEW · $200</Text>
              <Text style={s.heroTitle}>Your face,{'\n'}your sticker.</Text>
              <Text style={s.heroSub}>
                Snap a selfie. We turn it into an official-style Panini card in 5 seconds.
              </Text>
              <View style={s.heroCta}>
                <Text style={s.heroCtaText}>Create my Panini</Text>
                <Ionicons name="arrow-forward" size={14} color={COLORS.green} />
              </View>
            </View>
            {/* Card mock — dashed frame waiting for a photo */}
            <View style={s.paniniCardMock}>
              <View style={s.paniniCardStripe}>
                <View style={[s.paniniStripeBox, { backgroundColor: COLORS.green }]} />
                <View style={[s.paniniStripeBox, { backgroundColor: COLORS.gold }]} />
                <View style={[s.paniniStripeBox, { backgroundColor: COLORS.red }]} />
              </View>
              <View style={s.paniniCardBody}>
                <View style={s.paniniCameraCircle}>
                  <Ionicons name="camera" size={26} color={COLORS.green} />
                </View>
                <Text style={s.paniniHint}>TU CARA{'\n'}AQUÍ</Text>
              </View>
              <View style={s.paniniCardFoot}>
                <View style={s.paniniNameBar} />
                <View style={[s.paniniNameBar, { width: '60%' }]} />
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* 2. EXTRA STICKERS — Stars catalog with Messi + Cristiano gold mockups */}
        <TouchableOpacity
          onPress={() => router.push('/shop/stars')}
          activeOpacity={0.9}
          style={[s.hero, s.heroExtras]}
        >
          <View style={s.heroBody}>
            <View style={s.heroText}>
              <Text style={s.heroEyebrow}>GOAT · CRACK · STAR</Text>
              <Text style={s.heroTitle}>Buy the stars{'\n'}you're missing.</Text>
              <Text style={s.heroSub}>Messi, Cristiano, Yamal and 17 more — Base, Bronze, Silver or Gold.</Text>
              <View style={[s.heroCta, { backgroundColor: COLORS.gold }]}>
                <Text style={[s.heroCtaText, { color: COLORS.red }]}>Explore extras</Text>
                <Ionicons name="arrow-forward" size={14} color={COLORS.red} />
              </View>
            </View>
            {/* Mini sticker stack — Messi front, Cristiano peeking behind */}
            <View style={s.starMockWrap}>
              <View style={[s.starMock, s.starMockBack]}>
                <View style={s.starMockShine} />
                <Text style={s.starMockNum}>2</Text>
                <View style={s.starMockAvatar}>
                  <Text style={s.starMockInitial}>CR</Text>
                </View>
                <Text style={s.starMockName}>RONALDO</Text>
                <Text style={s.starMockCountry}>POR</Text>
                <View style={s.starMockRarity}>
                  <Text style={s.starMockRarityText}>GOLD</Text>
                </View>
              </View>
              <View style={[s.starMock, s.starMockFront]}>
                <View style={s.starMockShine} />
                <Text style={s.starMockNum}>1</Text>
                <View style={s.starMockAvatar}>
                  <Text style={s.starMockInitial}>M</Text>
                </View>
                <Text style={s.starMockName}>MESSI</Text>
                <Text style={s.starMockCountry}>ARG</Text>
                <View style={s.starMockRarity}>
                  <Text style={s.starMockRarityText}>GOLD</Text>
                </View>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* 3. LLENA TU ÁLBUM — dynamic */}
        <TouchableOpacity
          onPress={() => router.push('/shop/album')}
          activeOpacity={0.9}
          style={[s.hero, s.heroAlbum]}
        >
          <View style={s.heroIconCircle}>
            <Ionicons name="book" size={28} color={COLORS.gold} />
          </View>
          {missing > 0 ? (
            <>
              <Text style={s.heroEyebrow}>YOUR ALBUM · {completionPct}%</Text>
              <Text style={s.heroTitle}>You're missing {missing} stickers</Text>
              <View style={s.albumProgressBar}>
                <View style={[s.albumProgressFill, { width: `${completionPct}%` }]} />
              </View>
              <Text style={s.heroSub}>Estimated total: {fmt(estCostToFinish)} MXN</Text>
              <View style={s.heroCta}>
                <Text style={s.heroCtaText}>Complete album</Text>
                <Ionicons name="arrow-forward" size={14} color={COLORS.green} />
              </View>
            </>
          ) : (
            <>
              <Text style={s.heroEyebrow}>CONGRATULATIONS!</Text>
              <Text style={s.heroTitle}>Album complete! 🏆</Text>
              <Text style={s.heroSub}>Reserve your spot for World Cup 2030.</Text>
              <View style={s.heroCta}>
                <Text style={s.heroCtaText}>Reserve for 2030</Text>
                <Ionicons name="arrow-forward" size={14} color={COLORS.green} />
              </View>
            </>
          )}
        </TouchableOpacity>

        {/* 4. PRODUCTOS DEL MUNDIAL */}
        <View style={s.productsHeader}>
          <Ionicons name="trophy" size={20} color={COLORS.ink} />
          <Text style={s.productsTitle}>World Cup products</Text>
        </View>

        {/* 4a — category carousel */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.carousel}
        >
          {PRODUCT_CATEGORIES.map((c) => {
            const count = c.id === 'all'
              ? products.length
              : products.filter((p) => p.category === c.id).length
            if (c.id !== 'all' && count === 0) return null
            return (
              <TouchableOpacity
                key={c.id}
                onPress={() => router.push(`/shop/products?cat=${c.id}`)}
                style={s.catCard}
                activeOpacity={0.85}
              >
                <Text style={s.catEmoji}>{c.emoji}</Text>
                <Text style={s.catLabel}>{c.label}</Text>
                <Text style={s.catCount}>{count} items</Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        {/* 4b — 2-col grid of all products */}
        <View style={s.gridWrap}>
          <View style={s.grid}>
            {filteredProducts.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={s.productCard}
                onPress={() => router.push(`/producto/${p.id}`)}
                activeOpacity={0.85}
              >
                <View style={[s.productImg, { backgroundColor: p.gradient[0] }]}>
                  {p.image ? (
                    <Image source={{ uri: p.image }} style={s.productImgInner} resizeMode="cover" />
                  ) : (
                    <Text style={s.productEmoji}>{p.emoji}</Text>
                  )}
                  {p.badge && (
                    <View style={s.productBadge}>
                      <Text style={s.productBadgeText}>{p.badge}</Text>
                    </View>
                  )}
                </View>
                <Text style={s.productName} numberOfLines={2}>{p.name}</Text>
                <View style={s.productFooter}>
                  <Text style={s.productPrice}>{fmt(p.price)}</Text>
                  <TouchableOpacity
                    onPress={() => useCartStore.getState().add(p.id)}
                    style={s.productAddBtn}
                    hitSlop={6}
                  >
                    <Ionicons name="add" size={18} color={COLORS.paper} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: SPACING.xxxl }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.cream },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
  },
  titleSmall: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
  titleBig: { fontSize: 26, fontWeight: FONT.weight.black, color: COLORS.ink, letterSpacing: -0.5 },
  cartBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.ink,
    alignItems: 'center', justifyContent: 'center',
  },
  cartBadge: {
    position: 'absolute', top: -4, right: -4,
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: COLORS.red,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: { color: COLORS.paper, fontWeight: '800', fontSize: 10 },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.paper,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1, fontSize: FONT.size.bodyM, color: COLORS.ink,
    paddingVertical: 4,
  },

  scroll: { paddingBottom: SPACING.lg },

  /* Hero cards */
  hero: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
    minHeight: 180,
    ...SHADOW.md,
  },
  heroPanini: { backgroundColor: COLORS.green, borderWidth: 2, borderColor: COLORS.gold },
  heroExtras: { backgroundColor: COLORS.red },
  heroAlbum:  { backgroundColor: COLORS.green },
  heroBody: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  heroText: { flex: 1 },
  heroIconCircle: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(255,209,0,0.18)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.sm,
  },

  /* Mi Panini card mock — dashed-frame placeholder card */
  paniniCardMock: {
    width: 96,
    backgroundColor: COLORS.paper,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.gold,
    borderStyle: 'dashed',
    overflow: 'hidden',
    transform: [{ rotate: '4deg' }],
    ...SHADOW.md,
  },
  paniniCardStripe: {
    flexDirection: 'row', height: 8,
  },
  paniniStripeBox: { flex: 1 },
  paniniCardBody: {
    height: 92,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,99,65,0.05)',
    paddingTop: 6,
  },
  paniniCameraCircle: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: COLORS.cream,
    borderWidth: 2, borderColor: COLORS.green,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  paniniHint: {
    fontSize: 8, fontWeight: '900',
    color: COLORS.green, letterSpacing: 1,
    textAlign: 'center', lineHeight: 9,
  },
  paniniCardFoot: {
    padding: 6, gap: 3,
    backgroundColor: COLORS.paper,
  },
  paniniNameBar: {
    height: 3, backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 2,
  },

  /* Extras — Messi + Cristiano mini stickers */
  starMockWrap: {
    width: 110, height: 140,
    alignItems: 'center', justifyContent: 'center',
  },
  starMock: {
    position: 'absolute',
    width: 78, height: 110,
    backgroundColor: '#FFF8DC',
    borderRadius: 8,
    borderWidth: 2, borderColor: COLORS.gold,
    padding: 6,
    alignItems: 'center',
    overflow: 'hidden',
    ...SHADOW.md,
  },
  starMockFront: {
    transform: [{ rotate: '-8deg' }, { translateX: -8 }],
    zIndex: 2,
  },
  starMockBack: {
    transform: [{ rotate: '12deg' }, { translateX: 14 }],
    zIndex: 1,
  },
  starMockShine: {
    position: 'absolute', top: 0, left: 0, right: 0, height: '40%',
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  starMockNum: {
    fontSize: 8, fontWeight: '900', color: COLORS.goldDark,
    alignSelf: 'flex-start',
  },
  starMockAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.green,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 4, marginBottom: 4,
    borderWidth: 1.5, borderColor: COLORS.gold,
  },
  starMockInitial: { color: COLORS.paper, fontWeight: '900', fontSize: 13 },
  starMockName: {
    fontSize: 9, fontWeight: '900',
    color: COLORS.ink, letterSpacing: 0.5,
  },
  starMockCountry: {
    fontSize: 7, fontWeight: '700',
    color: COLORS.textMuted, letterSpacing: 1,
    marginTop: 1,
  },
  starMockRarity: {
    position: 'absolute', bottom: 4, right: 4,
    backgroundColor: COLORS.gold,
    paddingHorizontal: 4, paddingVertical: 1,
    borderRadius: 3,
  },
  starMockRarityText: { fontSize: 7, fontWeight: '900', color: COLORS.red, letterSpacing: 0.5 },
  heroEyebrow: {
    fontSize: 11, fontWeight: '800',
    color: COLORS.gold, letterSpacing: 1.5, marginBottom: 4,
  },
  heroTitle: {
    fontSize: 22, fontWeight: FONT.weight.black,
    color: COLORS.paper, lineHeight: 26, letterSpacing: -0.3,
    marginBottom: 6,
  },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginBottom: SPACING.md, lineHeight: 18 },
  heroCta: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: COLORS.cream,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 99,
  },
  heroCtaText: { fontSize: 13, fontWeight: '900', color: COLORS.green },

  albumProgressBar: {
    height: 6, backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 99, overflow: 'hidden', marginBottom: SPACING.sm,
  },
  albumProgressFill: { height: '100%', backgroundColor: COLORS.gold, borderRadius: 99 },

  /* Productos section */
  productsHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  productsTitle: { fontSize: 18, fontWeight: FONT.weight.black, color: COLORS.ink, letterSpacing: -0.3 },

  carousel: { paddingHorizontal: SPACING.lg, gap: SPACING.sm, paddingBottom: SPACING.md },
  catCard: {
    width: 110,
    backgroundColor: COLORS.paper,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'flex-start',
    gap: 4,
  },
  catEmoji: { fontSize: 28, marginBottom: 4 },
  catLabel: { fontSize: 13, fontWeight: '800', color: COLORS.ink },
  catCount: { fontSize: 11, color: COLORS.textMuted },

  /* Grid */
  gridWrap: { paddingHorizontal: SPACING.md, paddingTop: SPACING.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md },
  productCard: {
    width: '47%',
    backgroundColor: COLORS.paper,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1, borderColor: COLORS.border,
    ...SHADOW.sm,
  },
  productImg: { height: 130, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  productImgInner: { width: '100%', height: '100%' },
  productEmoji: { fontSize: 48 },
  productBadge: {
    position: 'absolute', top: 8, left: 8,
    backgroundColor: COLORS.paper,
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 4,
  },
  productBadgeText: { fontSize: 9, fontWeight: '900', color: COLORS.red, letterSpacing: 0.5 },
  productName: { fontSize: 13, fontWeight: '800', color: COLORS.ink, paddingHorizontal: SPACING.md, paddingTop: SPACING.sm, lineHeight: 16 },
  productFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: SPACING.md,
  },
  productPrice: { fontSize: 15, fontWeight: FONT.weight.black, color: COLORS.green },
  productAddBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.ink,
    alignItems: 'center', justifyContent: 'center',
  },
})
