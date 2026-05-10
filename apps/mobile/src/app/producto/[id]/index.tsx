import { useState } from 'react'
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { fmt } from '@/lib/data'
import { useCartStore } from '@/lib/cart-store'
import { useProductsStore } from '@/lib/products-store'

export default function ProductoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const product = useProductsStore((s) => s.getById(id))
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const add = useCartStore((s) => s.add)

  if (!product) return <SafeAreaView><Text style={{ padding: 32 }}>Producto no encontrado</Text></SafeAreaView>

  function handleAdd() {
    add(product!.id, qty)
    setAdded(true)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView bounces={false}>
        {/* Hero */}
        <View style={[s.hero, { backgroundColor: product.gradient[0] }]}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backIcon}>‹</Text>
          </TouchableOpacity>
          {product.image ? (
            <Image source={{ uri: product.image }} style={s.heroImage} resizeMode="contain" />
          ) : (
            <Text style={s.heroEmoji}>{product.emoji}</Text>
          )}
        </View>

        <View style={s.body}>
          {product.badge && <Text style={s.badge}>{product.badge}</Text>}
          <Text style={s.name}>{product.name}</Text>
          <Text style={s.desc}>{product.description}</Text>
          <Text style={s.price}>{fmt(product.price)}</Text>

          {/* Qty */}
          <View style={s.qtySection}>
            <Text style={s.qtyLabel}>Cantidad</Text>
            <View style={s.qtyRow}>
              <TouchableOpacity onPress={() => setQty((q) => Math.max(1, q - 1))} style={s.qtyBtn} disabled={qty <= 1}>
                <Text style={[s.qtyBtnText, qty <= 1 && { opacity: 0.3 }]}>−</Text>
              </TouchableOpacity>
              <Text style={s.qty}>{qty}</Text>
              <TouchableOpacity onPress={() => setQty((q) => q + 1)} style={s.qtyBtn}>
                <Text style={s.qtyBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={[s.addBtn, added && s.addBtnDone]} onPress={handleAdd} activeOpacity={0.85}>
            <Text style={s.addBtnText}>
              {added ? '✓ Agregado al carrito' : `Agregar${qty > 1 ? ` (${qty})` : ''} — ${fmt(product.price * qty)}`}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/carrito')} style={{ alignItems: 'center', marginTop: 12 }}>
            <Text style={{ color: '#006341', fontWeight: '600', fontSize: 14 }}>Ver carrito</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FEFCE8' },
  hero: { height: 240, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  heroImage: { width: '100%', height: '100%' },
  backBtn: { position: 'absolute', top: 16, left: 16, width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  backIcon: { fontSize: 22, color: '#374151', lineHeight: 28 },
  heroEmoji: { fontSize: 72 },
  body: { padding: 20, backgroundColor: '#FEFCE8' },
  badge: { fontSize: 11, fontWeight: '800', color: '#CE1126', letterSpacing: 0.5, marginBottom: 4 },
  name: { fontSize: 24, fontWeight: '800', color: '#1C1917', lineHeight: 30 },
  desc: { fontSize: 14, color: '#6B7280', marginTop: 6, lineHeight: 20 },
  price: { fontSize: 32, fontWeight: '900', color: '#006341', marginTop: 12 },
  qtySection: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 20 },
  qtyLabel: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F3F4F6', borderRadius: 12, padding: 4 },
  qtyBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  qtyBtnText: { fontSize: 20, fontWeight: '700', color: '#374151' },
  qty: { fontSize: 16, fontWeight: '800', color: '#1C1917', minWidth: 24, textAlign: 'center' },
  addBtn: { backgroundColor: '#CE1126', borderRadius: 18, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  addBtnDone: { backgroundColor: '#006341' },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
})
