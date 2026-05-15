import { useState } from 'react'
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, FlatList } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { CATEGORIES, fmt } from '@/lib/data'
import { useCartStore } from '@/lib/cart-store'
import { useProductsStore } from '@/lib/products-store'
import { COLORS, SPACING, RADIUS, FONT, SHADOW } from '@/lib/theme'

export default function TiendaScreen() {
  const [cat, setCat] = useState('all')
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
      {/* Header with back + cart */}
      <View style={s.headerBar}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={s.title}>Store</Text>
        <TouchableOpacity onPress={() => router.push('/carrito')} style={s.cartBtn}>
          <Text style={{ fontSize: 18 }}>🛒</Text>
          {cartCount > 0 && (
            <View style={s.cartBadge}>
              <Text style={s.cartBadgeText}>{cartCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Uber-Eats style 3 mode buttons */}
      <View style={s.modeRow}>
        <TouchableOpacity style={[s.modeBtn, s.modeBtnActive]}>
          <Text style={{ fontSize: 22 }}>📦</Text>
          <Text style={s.modeBtnTextActive}>Delivery</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.modeBtn}>
          <Text style={{ fontSize: 22 }}>🏪</Text>
          <Text style={s.modeBtnText}>Pickup</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.modeBtn}>
          <Text style={{ fontSize: 22 }}>🎁</Text>
          <Text style={s.modeBtnText}>Gift</Text>
        </TouchableOpacity>
      </View>

      {/* Category pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.catScroll}>
        {CATEGORIES.map((c) => (
          <TouchableOpacity key={c.id} onPress={() => setCat(c.id)} style={[s.pill, cat === c.id && s.pillActive]}>
            <Text style={[s.pillText, cat === c.id && s.pillTextActive]}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

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
  titleRow: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: SPACING.xs },
  title: { fontSize: FONT.size.displayL, fontWeight: FONT.weight.black, color: COLORS.ink },
  catScroll: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, gap: SPACING.sm, flexDirection: 'row' },
  pill: { paddingHorizontal: SPACING.lg, paddingVertical: 6, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.paper },
  pillActive: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  pillText: { fontSize: FONT.size.bodyM, fontWeight: FONT.weight.bold, color: COLORS.textMuted },
  pillTextActive: { color: COLORS.paper },
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
