import { useState } from 'react'
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, FlatList } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { CATEGORIES, fmt } from '@/lib/data'
import { useCartStore } from '@/lib/cart-store'
import { useProductsStore } from '@/lib/products-store'

export default function TiendaScreen() {
  const [cat, setCat] = useState('all')
  const [added, setAdded] = useState<string | null>(null)
  const add = useCartStore((s) => s.add)
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
      <View style={s.titleRow}><Text style={s.title}>Store</Text></View>

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
  safe: { flex: 1, backgroundColor: '#FEFCE8' },
  titleRow: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  title: { fontSize: 26, fontWeight: '800', color: '#1C1917' },
  catScroll: { paddingHorizontal: 16, paddingVertical: 8, gap: 8, flexDirection: 'row' },
  pill: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 99, borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#fff' },
  pillActive: { backgroundColor: '#006341', borderColor: '#006341' },
  pillText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  pillTextActive: { color: '#fff' },
  list: { paddingHorizontal: 12, paddingBottom: 32 },
  row: { gap: 12, marginBottom: 12 },
  card: { flex: 1, backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#F3F4F6' },
  cardImg: { height: 120, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  cardImage: { width: '100%', height: '100%' },
  cardEmoji: { fontSize: 44 },
  badge: { marginHorizontal: 10, marginTop: 6, fontSize: 10, fontWeight: '800', color: '#CE1126', letterSpacing: 0.5 },
  cardName: { marginHorizontal: 10, marginTop: 4, fontSize: 13, fontWeight: '700', color: '#1C1917', lineHeight: 17 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 10 },
  price: { fontSize: 14, fontWeight: '800', color: '#006341' },
  addBtn: { width: 32, height: 32, borderRadius: 99, backgroundColor: 'rgba(0,99,65,0.12)', alignItems: 'center', justifyContent: 'center' },
  addBtnDone: { backgroundColor: '#006341' },
  addBtnText: { fontSize: 18, fontWeight: '700', color: '#006341', lineHeight: 22 },
})
