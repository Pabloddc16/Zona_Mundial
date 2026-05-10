import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useCartStore, cartItems, cartSubtotal } from '@/lib/cart-store'
import { useProductsStore } from '@/lib/products-store'
import { fmt } from '@/lib/data'

const SHIPPING = 120

export default function CarritoScreen() {
  const cart = useCartStore((s) => s.cart)
  const { add, sub, remove } = useCartStore()
  const products = useProductsStore((s) => s.products)
  const items = cartItems(cart, products)
  const subtotal = cartSubtotal(cart, products)
  const total = subtotal + SHIPPING

  if (items.length === 0) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.empty}>
          <Text style={{ fontSize: 56, marginBottom: 12 }}>🛒</Text>
          <Text style={s.emptyTitle}>Tu carrito está vacío</Text>
          <Text style={s.emptySub}>Agrega productos de la tienda</Text>
          <TouchableOpacity style={s.goBtn} onPress={() => router.push('/tienda')}>
            <Text style={s.goBtnText}>Ir a la tienda</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={s.safe}>
      <FlatList
        data={items}
        keyExtractor={(i) => i!.id}
        contentContainerStyle={s.list}
        ListHeaderComponent={<Text style={s.title}>Carrito</Text>}
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={[s.cardImg, { backgroundColor: item!.gradient[0] }]}>
              <Text style={{ fontSize: 28 }}>{item!.emoji}</Text>
            </View>
            <View style={s.cardBody}>
              <Text style={s.itemName} numberOfLines={2}>{item!.name}</Text>
              <Text style={s.itemPrice}>{fmt(item!.price)}</Text>
              <View style={s.qtyRow}>
                <TouchableOpacity onPress={() => sub(item!.id)} style={s.qtyBtn}><Text style={s.qtyBtnText}>−</Text></TouchableOpacity>
                <Text style={s.qty}>{item!.qty}</Text>
                <TouchableOpacity onPress={() => add(item!.id)} style={s.qtyBtn}><Text style={s.qtyBtnText}>+</Text></TouchableOpacity>
              </View>
            </View>
            <View style={s.cardRight}>
              <Text style={s.lineTotal}>{fmt(item!.price * item!.qty)}</Text>
              <TouchableOpacity onPress={() => remove(item!.id)}><Text style={{ color: '#9CA3AF', fontSize: 12, marginTop: 4 }}>Quitar</Text></TouchableOpacity>
            </View>
          </View>
        )}
        ListFooterComponent={
          <View style={{ marginTop: 8 }}>
            <View style={s.summary}>
              <Row label="Subtotal" value={fmt(subtotal)} />
              <Row label="Envío estimado" value={fmt(SHIPPING)} />
              <View style={[s.summaryRow, { borderTopWidth: 1, borderTopColor: '#F3F4F6', marginTop: 8, paddingTop: 8 }]}>
                <Text style={{ fontWeight: '800', color: '#1C1917', fontSize: 15 }}>Total</Text>
                <Text style={{ fontWeight: '800', color: '#1C1917', fontSize: 15 }}>{fmt(total)}</Text>
              </View>
            </View>
            <TouchableOpacity style={s.checkoutBtn} onPress={() => router.push('/checkout')}>
              <Text style={s.checkoutBtnText}>Continuar pedido</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/tienda')} style={{ alignItems: 'center', marginTop: 12 }}>
              <Text style={{ color: '#006341', fontWeight: '600', fontSize: 14 }}>Seguir comprando</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.summaryRow}>
      <Text style={{ color: '#6B7280', fontSize: 13 }}>{label}</Text>
      <Text style={{ color: '#6B7280', fontSize: 13 }}>{value}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FEFCE8' },
  list: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 26, fontWeight: '800', color: '#1C1917', marginBottom: 16 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1C1917', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#9CA3AF', marginBottom: 24 },
  goBtn: { backgroundColor: '#006341', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 16 },
  goBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#F3F4F6', gap: 12 },
  cardImg: { width: 64, height: 64, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1 },
  itemName: { fontSize: 13, fontWeight: '700', color: '#1C1917', lineHeight: 17 },
  itemPrice: { fontSize: 13, fontWeight: '700', color: '#006341', marginTop: 2 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  qtyBtn: { width: 24, height: 24, borderRadius: 99, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  qtyBtnText: { fontSize: 14, fontWeight: '700', color: '#374151' },
  qty: { fontSize: 14, fontWeight: '700', color: '#1C1917', minWidth: 16, textAlign: 'center' },
  cardRight: { alignItems: 'flex-end', justifyContent: 'center' },
  lineTotal: { fontSize: 14, fontWeight: '800', color: '#1C1917' },
  summary: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#F3F4F6' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  checkoutBtn: { backgroundColor: '#CE1126', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 12 },
  checkoutBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
})
