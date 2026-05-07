import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { api, type Order } from '@/lib/api'
import { fmt } from '@/lib/data'

const STATUS_LABEL: Record<string, string> = {
  pendiente: 'Pendiente',
  confirmado: 'Confirmado',
  en_camino: 'En camino',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
}

const STATUS_COLOR: Record<string, [string, string]> = {
  pendiente: ['#FEF9C3', '#92400E'],
  confirmado: ['#DBEAFE', '#1E40AF'],
  en_camino: ['#FED7AA', '#9A3412'],
  entregado: ['rgba(0,99,65,0.1)', '#006341'],
  cancelado: ['rgba(206,17,38,0.08)', '#CE1126'],
}

export default function OrdenScreen() {
  const { orderNumber } = useLocalSearchParams<{ orderNumber: string }>()
  const [order, setOrder] = useState<Order | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.orders.get(orderNumber)
      .then(setOrder)
      .catch((e: Error) => setError(e.message))
  }, [orderNumber])

  if (error) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <Text style={{ fontSize: 48 }}>😕</Text>
          <Text style={{ color: '#6B7280', marginTop: 12, marginBottom: 20 }}>{error}</Text>
          <TouchableOpacity onPress={() => router.push('/')} style={s.btn}>
            <Text style={s.btnText}>Ir al álbum</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  if (!order) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <ActivityIndicator size="large" color="#006341" />
          <Text style={{ color: '#9CA3AF', marginTop: 12 }}>Cargando pedido...</Text>
        </View>
      </SafeAreaView>
    )
  }

  const [bg, fg] = STATUS_COLOR[order.status] ?? ['#F3F4F6', '#374151']

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll}>
        {/* Success hero */}
        <View style={s.hero}>
          <Text style={{ fontSize: 64 }}>🎉</Text>
          <Text style={s.heroTitle}>¡Pedido confirmado!</Text>
          <Text style={s.heroSub}>Recibirás tu pedido pronto</Text>
          <Text style={s.orderNum}>#{order.order_number}</Text>
        </View>

        {/* Status */}
        <View style={[s.statusCard, { backgroundColor: bg }]}>
          <Text style={{ fontSize: 13, color: '#6B7280' }}>Estado</Text>
          <Text style={[s.statusText, { color: fg }]}>{STATUS_LABEL[order.status] ?? order.status}</Text>
        </View>

        {/* Details */}
        <View style={s.card}>
          <Row label="Cliente" value={order.customer_name} />
          <Row label="Teléfono" value={order.phone} />
          {order.address ? <Row label="Dirección" value={order.address} /> : null}
          <Row label="Entrega" value={order.delivery_type === 'envio' ? 'Envío a domicilio' : 'Recoger en tienda'} />
          <Row label="Pago" value={order.payment_method} />
        </View>

        {/* Items */}
        {order.order_items && order.order_items.length > 0 && (
          <View style={s.card}>
            <Text style={s.sectionLabel}>Productos</Text>
            {order.order_items.map((item, i) => (
              <View key={i} style={s.itemRow}>
                <Text style={{ fontSize: 13, color: '#6B7280', flex: 1 }}>{item.name} × {item.qty}</Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#1C1917' }}>{fmt(item.price * item.qty)}</Text>
              </View>
            ))}
            {order.shipping > 0 && (
              <View style={s.itemRow}>
                <Text style={{ fontSize: 13, color: '#9CA3AF' }}>Envío</Text>
                <Text style={{ fontSize: 13, color: '#9CA3AF' }}>{fmt(order.shipping)}</Text>
              </View>
            )}
            <View style={[s.itemRow, { borderTopWidth: 1, borderTopColor: '#F3F4F6', marginTop: 8, paddingTop: 8 }]}>
              <Text style={{ fontWeight: '800', color: '#1C1917' }}>Total</Text>
              <Text style={{ fontWeight: '800', color: '#1C1917' }}>{fmt(order.total)}</Text>
            </View>
          </View>
        )}

        <TouchableOpacity style={s.btn} onPress={() => router.push('/')}>
          <Text style={s.btnText}>Volver al álbum</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/tienda')} style={{ alignItems: 'center', marginTop: 12 }}>
          <Text style={{ color: '#006341', fontWeight: '600', fontSize: 14 }}>Seguir comprando</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
      <Text style={{ fontSize: 13, color: '#9CA3AF' }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: '600', color: '#1C1917', flex: 1, textAlign: 'right' }} numberOfLines={2}>{value}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FEFCE8' },
  scroll: { padding: 16, paddingBottom: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  hero: { alignItems: 'center', marginBottom: 20, paddingVertical: 8 },
  heroTitle: { fontSize: 24, fontWeight: '800', color: '#1C1917', marginTop: 8 },
  heroSub: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  orderNum: { marginTop: 8, fontSize: 15, fontWeight: '700', color: '#374151', fontVariant: ['tabular-nums'] },
  statusCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 14, padding: 14, marginBottom: 10 },
  statusText: { fontWeight: '800', fontSize: 14 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#F3F4F6', marginBottom: 10 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  btn: { backgroundColor: '#006341', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
})
