/**
 * /shop/products?cat=<id> — flat product list filtered by category.
 * Reached from the category carousel in Tienda.
 */
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useProductsStore } from '@/lib/products-store'
import { useCartStore } from '@/lib/cart-store'
import { fmt } from '@/lib/data'
import { COLORS, SPACING, RADIUS, FONT, SHADOW } from '@/lib/theme'

const CAT_LABEL: Record<string, string> = {
  all: 'All products',
  albumes: 'Albums',
  sobres: 'Packs',
  packs: 'Complete sets',
  coca: 'Coca-Cola',
  jerseys: 'Jerseys',
  balones: 'Balls',
  trofeos: 'Trophies',
  accesorios: 'Accessories',
  cartas: 'Cards',
}

export default function ProductsScreen() {
  const { cat } = useLocalSearchParams<{ cat?: string }>()
  const selectedCat = cat ?? 'all'
  const products = useProductsStore((s) => s.products)
  const add = useCartStore((s) => s.add)

  const visible = selectedCat === 'all' ? products : products.filter((p) => p.category === selectedCat)

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
        </TouchableOpacity>
        <Text style={s.title}>{CAT_LABEL[selectedCat] ?? selectedCat}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.grid}>
          {visible.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={s.card}
              onPress={() => router.push(`/producto/${p.id}`)}
              activeOpacity={0.85}
            >
              <View style={[s.cardImg, { backgroundColor: p.gradient[0] }]}>
                {p.image ? (
                  <Image source={{ uri: p.image }} style={s.cardImgInner} resizeMode="cover" />
                ) : (
                  <Text style={s.cardEmoji}>{p.emoji}</Text>
                )}
                {p.badge && (
                  <View style={s.badge}>
                    <Text style={s.badgeText}>{p.badge}</Text>
                  </View>
                )}
              </View>
              <Text style={s.cardName} numberOfLines={2}>{p.name}</Text>
              <View style={s.footer}>
                <Text style={s.price}>{fmt(p.price)}</Text>
                <TouchableOpacity onPress={() => add(p.id)} style={s.addBtn} hitSlop={6}>
                  <Ionicons name="add" size={18} color={COLORS.paper} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </View>
        {visible.length === 0 && (
          <View style={s.empty}>
            <Ionicons name="search-outline" size={32} color={COLORS.textMuted} />
            <Text style={s.emptyText}>No products in this category yet</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.cream },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '900', color: COLORS.ink },
  scroll: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md },
  card: { width: '47%', backgroundColor: COLORS.paper, borderRadius: RADIUS.lg, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border, ...SHADOW.sm },
  cardImg: { height: 130, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  cardImgInner: { width: '100%', height: '100%' },
  cardEmoji: { fontSize: 48 },
  badge: { position: 'absolute', top: 8, left: 8, backgroundColor: COLORS.paper, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeText: { fontSize: 9, fontWeight: '900', color: COLORS.red, letterSpacing: 0.5 },
  cardName: { fontSize: 13, fontWeight: '800', color: COLORS.ink, paddingHorizontal: SPACING.md, paddingTop: SPACING.sm, lineHeight: 16 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.md },
  price: { fontSize: 15, fontWeight: FONT.weight.black, color: COLORS.green },
  addBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.ink, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingVertical: SPACING.xxxl, gap: SPACING.sm },
  emptyText: { fontSize: 13, color: COLORS.textMuted },
})
