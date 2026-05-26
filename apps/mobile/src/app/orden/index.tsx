/**
 * Order history — lists the auth user's orders with pickup codes visible.
 * Replaces the "Order history coming soon" stub in profile.
 */
import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, RefreshControl,
} from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { api, type Order } from '@/lib/api'
import { fmt } from '@/lib/data'
import { COLORS, SPACING, RADIUS, FONT, SHADOW } from '@/lib/theme'

const STATUS_COPY: Record<string, { label: string; color: string }> = {
  CREATED:   { label: 'Esperando pago',  color: COLORS.goldDark },
  PAID:      { label: 'Pagado',          color: COLORS.green },
  ASSIGNED:  { label: 'Preparando',      color: COLORS.goldDark },
  IN_ROUTE:  { label: 'En camino',       color: COLORS.green },
  DELIVERED: { label: 'Entregado',       color: COLORS.green },
  CANCELLED: { label: 'Cancelado',       color: COLORS.red },
}

export default function OrderHistoryScreen() {
  const [orders, setOrders] = useState<Order[] | null>(null)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    setError('')
    try {
      const r = await api.orders.mine()
      setOrders(r.items)
    } catch (e) {
      setError((e as Error).message || 'No se pudieron cargar tus pedidos')
    }
  }

  useEffect(() => { load() }, [])

  async function onRefresh() {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={COLORS.ink} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Mis pedidos</Text>
        <View style={{ width: 24 }} />
      </View>

      {orders === null && !error ? (
        <View style={s.center}>
          <ActivityIndicator color={COLORS.green} />
        </View>
      ) : error ? (
        <View style={s.center}>
          <Text style={s.errorText}>{error}</Text>
          <TouchableOpacity onPress={load} style={s.retryBtn}>
            <Text style={s.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : orders && orders.length === 0 ? (
        <View style={s.center}>
          <Ionicons name="receipt-outline" size={48} color={COLORS.textFaint} />
          <Text style={s.emptyTitle}>Aún no tienes pedidos</Text>
          <Text style={s.emptySub}>Tus compras aparecerán aquí.</Text>
          <TouchableOpacity onPress={() => router.push('/tienda')} style={s.shopBtn}>
            <Text style={s.shopText}>Ir a la tienda</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.green} />}
        >
          {orders!.map((o) => {
            const status = STATUS_COPY[o.status] ?? { label: o.status, color: COLORS.textMuted }
            const isPickup = o.delivery_type === 'local'
            return (
              <TouchableOpacity
                key={o.order_number}
                onPress={() => router.push(`/orden/${o.order_number}`)}
                style={s.card}
                activeOpacity={0.9}
              >
                <View style={s.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.orderNum}>#{o.order_number}</Text>
                    <Text style={s.date}>{new Date(o.date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
                  </View>
                  <Text style={[s.status, { color: status.color }]}>{status.label}</Text>
                </View>

                {isPickup && o.pickup_code ? (
                  <View style={s.codeRow}>
                    <Ionicons name="key" size={14} color={COLORS.gold} />
                    <Text style={s.codeLabel}>Código de recolección</Text>
                    <Text style={s.codeValue}>{o.pickup_code}</Text>
                  </View>
                ) : null}

                <View style={[s.row, { marginTop: SPACING.sm }]}>
                  <Text style={s.itemsCount}>
                    {(o.order_items?.length ?? 0)} {o.order_items?.length === 1 ? 'artículo' : 'artículos'}
                  </Text>
                  <Text style={s.total}>{fmt(o.total)}</Text>
                </View>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.cream },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: FONT.size.displayM, fontWeight: FONT.weight.black, color: COLORS.ink },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl, gap: SPACING.md },
  errorText: { fontSize: FONT.size.bodyM, color: COLORS.red, textAlign: 'center' },
  retryBtn: { backgroundColor: COLORS.ink, borderRadius: RADIUS.full, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md },
  retryText: { color: COLORS.paper, fontWeight: FONT.weight.bold },

  emptyTitle: { fontSize: FONT.size.displayM, fontWeight: FONT.weight.black, color: COLORS.ink },
  emptySub: { fontSize: FONT.size.bodyM, color: COLORS.textMuted, textAlign: 'center' },
  shopBtn: {
    backgroundColor: COLORS.green, borderWidth: 2, borderColor: COLORS.gold,
    borderRadius: RADIUS.full, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md,
    marginTop: SPACING.md,
  },
  shopText: { color: COLORS.paper, fontWeight: FONT.weight.black },

  list: { padding: SPACING.lg, gap: SPACING.md },

  card: {
    backgroundColor: COLORS.paper, borderRadius: RADIUS.lg,
    padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border,
    ...SHADOW.sm,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderNum: { fontSize: FONT.size.bodyL, fontWeight: FONT.weight.black, color: COLORS.ink, fontVariant: ['tabular-nums'] },
  date: { fontSize: FONT.size.bodyS, color: COLORS.textMuted, marginTop: 2 },
  status: { fontSize: FONT.size.bodyS, fontWeight: FONT.weight.black, textTransform: 'uppercase', letterSpacing: 1 },

  codeRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    marginTop: SPACING.md, paddingTop: SPACING.md,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  codeLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: FONT.weight.bold, textTransform: 'uppercase', letterSpacing: 1 },
  codeValue: {
    marginLeft: 'auto',
    fontSize: 18, fontWeight: FONT.weight.black,
    color: COLORS.green, letterSpacing: 3,
    fontVariant: ['tabular-nums'],
  },

  itemsCount: { fontSize: FONT.size.bodyS, color: COLORS.textMuted },
  total: { fontSize: FONT.size.bodyL, fontWeight: FONT.weight.black, color: COLORS.ink, fontVariant: ['tabular-nums'] },
})
