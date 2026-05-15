import { useState } from 'react'
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, FlatList } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { CATEGORIES, fmt } from '@/lib/data'
import { useCartStore } from '@/lib/cart-store'
import { useProductsStore } from '@/lib/products-store'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, SPACING, RADIUS, FONT, SHADOW } from '@/lib/theme'

type Mode = 'delivery' | 'pickup' | 'gift'

export default function TiendaScreen() {
  const [cat, setCat] = useState('all')
  const [mode, setMode] = useState<Mode>('delivery')
  const [added, setAdded] = useState<string | null>(null)
  const add = useCartStore((s) => s.add)
  const cart = useCartStore((s) => s.cart)
  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0)
  const products = useProductsStore((s) => s.products)

  const visible = cat === 'all' ? products : products.filter((p) => p.category === cat)

  function handleAdd(id: string) {
    add(id)
    setAdded(id)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
    setTimeout(() => setAdded(null), 1200)
  }

  return (
    <SafeAreaView style={s.safe}>
      {/* Header — cart left, Cards quick-filter top-right */}
      <View style={s.headerBar}>
        <TouchableOpacity onPress={() => router.push('/carrito')} style={s.cartBtn}>
          <Ionicons name="cart-outline" size={20} color={COLORS.paper} />
          {cartCount > 0 && (
            <View style={s.cartBadge}>
              <Text style={s.cartBadgeText}>{cartCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        <Text style={s.title}>Store</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            onPress={() => setCat(cat === 'cartas' ? 'all' : 'cartas')}
            style={[s.cardaBtn, cat === 'cartas' && s.cardaBtnActive]}
          >
            <Ionicons
              name="albums-outline"
              size={14}
              color={cat === 'cartas' ? COLORS.paper : COLORS.ink}
            />
            <Text style={[s.cardaBtnText, cat === 'cartas' && s.cardaBtnTextActive]}>Cards</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={8}>
            <Ionicons name="close" size={20} color={COLORS.ink} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Uber-Eats style 3 mode buttons */}
      <View style={s.modeRow}>
        <TouchableOpacity style={[s.modeBtn, mode === 'delivery' && s.modeBtnActive]} onPress={() => setMode('delivery')}>
          <Ionicons name="cube-outline" size={22} color={mode === 'delivery' ? COLORS.paper : COLORS.ink} />
          <Text style={mode === 'delivery' ? s.modeBtnTextActive : s.modeBtnText}>Delivery</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.modeBtn, mode === 'pickup' && s.modeBtnActive]} onPress={() => setMode('pickup')}>
          <Ionicons name="storefront-outline" size={22} color={mode === 'pickup' ? COLORS.paper : COLORS.ink} />
          <Text style={mode === 'pickup' ? s.modeBtnTextActive : s.modeBtnText}>Pickup</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.modeBtn, mode === 'gift' && s.modeBtnActive]} onPress={() => setMode('gift')}>
          <Ionicons name="gift-outline" size={22} color={mode === 'gift' ? COLORS.paper : COLORS.ink} />
          <Text style={mode === 'gift' ? s.modeBtnTextActive : s.modeBtnText}>Gift</Text>
        </TouchableOpacity>
      </View>

      {/* Mode hint banner */}
      <View style={s.modeHint}>
        <Text style={s.modeHintText}>
          {mode === 'delivery' && '📍 Ships to your address in 2-5 days'}
          {mode === 'pickup' && '🏬 Reserve and pick up at the store, no shipping fee'}
          {mode === 'gift' && '💝 Send to a friend with a personal message'}
        </Text>
      </View>

      {/* Category pills — horizontal stable scroll */}
      <View style={s.catWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.catScroll}
          keyboardShouldPersistTaps="handled"
        >
          {CATEGORIES.map((c) => {
            const active = cat === c.id
            return (
              <TouchableOpacity
                key={c.id}
                onPress={() => setCat(c.id)}
                style={[s.pill, active && s.pillActive]}
                activeOpacity={0.7}
              >
                <Text style={[s.pillText, active && s.pillTextActive]} numberOfLines={1}>{c.label}</Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>

      <FlatList
        data={visible}
        keyExtractor={(p) => p.id}
        numColumns={2}
        contentContainerStyle={s.list}
        columnWrapperStyle={s.row}
        renderItem={({ item: p }) => (
          <TouchableOpacity style={s.card} onPress={() => router.push(`/producto/${p.id}`)} activeOpacity={0.8}>
            <View style={[s.cardImg, { backgroundColor: p.gradient[0] }]}>
              {p.image ? (
                <Image source={{ uri: p.image }} style={s.cardImage} resizeMode="cover" />
              ) : (
                <Text style={s.cardEmoji}>{p.emoji}</Text>
              )}
            </View>
            {p.badge && <Text style={s.badge}>{p.badge}</Text>}
            <Text style={s.cardName} numberOfLines={2}>{p.name}</Text>
            <View style={s.cardFooter}>
              <Text style={s.price}>{fmt(p.price)}</Text>
              <TouchableOpacity
                onPress={() => handleAdd(p.id)}
                style={[s.addBtn, added === p.id && s.addBtnDone]}
              >
                <Text style={s.addBtnText}>{added === p.id ? '✓' : '+'}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.cream },
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: SPACING.sm },
  backBtn: { width: 36, height: 36, borderRadius: RADIUS.md, backgroundColor: COLORS.surface2, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 22, color: COLORS.ink, lineHeight: 26 },
  cartBtn: { width: 40, height: 40, borderRadius: RADIUS.full, backgroundColor: COLORS.ink, alignItems: 'center', justifyContent: 'center' },
  cartBadge: { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: COLORS.red, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  cartBadgeText: { color: COLORS.paper, fontWeight: '800', fontSize: 10 },
  modeRow: { flexDirection: 'row', gap: SPACING.md, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  modeBtn: { flex: 1, padding: SPACING.md, borderRadius: RADIUS.lg, backgroundColor: COLORS.paper, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, gap: 6 },
  modeBtnActive: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  modeBtnText: { fontSize: FONT.size.bodyM, fontWeight: '700', color: COLORS.ink },
  modeBtnTextActive: { fontSize: FONT.size.bodyM, fontWeight: '700', color: COLORS.paper },
  modeHint: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm },
  modeHintText: { fontSize: FONT.size.bodyS, color: COLORS.textMuted, fontStyle: 'italic' },
  cardaBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.paper, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: COLORS.border },
  cardaBtnActive: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  cardaBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.ink },
  cardaBtnTextActive: { color: COLORS.paper },
  titleRow: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: SPACING.xs },
  title: { fontSize: FONT.size.displayL, fontWeight: FONT.weight.black, color: COLORS.ink },
  catWrap: { height: 52, justifyContent: 'center' },
  catScroll: { paddingHorizontal: SPACING.lg, alignItems: 'center', gap: SPACING.sm, paddingVertical: 0 },
  pill: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.paper,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  pillActive: {
    backgroundColor: COLORS.ink,
    borderColor: COLORS.ink,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMuted,
    includeFontPadding: false,
  },
  pillTextActive: {
    color: COLORS.paper,
  },
  list: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.xxxl },
  row: { gap: SPACING.md, marginBottom: SPACING.md },
  card: { flex: 1, backgroundColor: COLORS.paper, borderRadius: RADIUS.xl, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border, ...SHADOW.sm },
  cardImg: { height: 130, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  cardImage: { width: '100%', height: '100%' },
  cardEmoji: { fontSize: 48 },
  badge: { marginHorizontal: SPACING.md, marginTop: SPACING.sm, fontSize: FONT.size.label, fontWeight: FONT.weight.black, color: COLORS.red, letterSpacing: 1 },
  cardName: { marginHorizontal: SPACING.md, marginTop: SPACING.xs, fontSize: FONT.size.bodyM, fontWeight: FONT.weight.bold, color: COLORS.ink, lineHeight: 17 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.md },
  price: { fontSize: FONT.size.bodyL, fontWeight: FONT.weight.black, color: COLORS.green },
  addBtn: { width: 36, height: 36, borderRadius: RADIUS.full, backgroundColor: COLORS.ink, alignItems: 'center', justifyContent: 'center' },
  addBtnDone: { backgroundColor: COLORS.green },
  addBtnText: { fontSize: 20, fontWeight: FONT.weight.bold, color: COLORS.paper, lineHeight: 22 },
})
