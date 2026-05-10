import { useState } from 'react'
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { useCartStore, cartItems, cartSubtotal } from '@/lib/cart-store'
import { useProductsStore } from '@/lib/products-store'
import { api, type OrderPayload } from '@/lib/api'
import { fmt } from '@/lib/data'

const SHIPPING = 120
const PAYMENT_METHODS = ['Efectivo', 'Transferencia', 'Tarjeta']

export default function CheckoutScreen() {
  const cart = useCartStore((s) => s.cart)
  const clear = useCartStore((s) => s.clear)
  const products = useProductsStore((s) => s.products)
  const items = cartItems(cart, products)
  const subtotal = cartSubtotal(cart, products)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [payment, setPayment] = useState('Efectivo')
  const [notes, setNotes] = useState('')
  const [deliveryType, setDeliveryType] = useState<'envio' | 'local'>('envio')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const shipping = deliveryType === 'envio' ? SHIPPING : 0
  const total = subtotal + shipping

  async function submit() {
    if (!name.trim() || !phone.trim()) { setError('Nombre y teléfono requeridos'); return }
    if (deliveryType === 'envio' && !address.trim()) { setError('Dirección requerida para envío'); return }
    setLoading(true)
    setError('')
    try {
      const notesVal = notes.trim()
      const payload: OrderPayload = {
        customer_name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        delivery_type: deliveryType,
        payment_method: payment,
        shipping,
        items: items.map((i) => ({ product_id: i!.id, name: i!.name, qty: i!.qty, price: i!.price })),
        ...(notesVal ? { notes: notesVal } : {}),
      }
      const order = await api.orders.create(payload)
      clear()
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
      router.replace(`/orden/${order.order_number}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al procesar pedido')
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {})
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={s.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
              <Text style={s.backIcon}>‹</Text>
            </TouchableOpacity>
            <Text style={s.title}>Tu pedido</Text>
          </View>

          {/* Delivery type */}
          <Section label="Tipo de entrega">
            <View style={s.deliveryRow}>
              {(['envio', 'local'] as const).map((t) => (
                <TouchableOpacity key={t} onPress={() => setDeliveryType(t)} style={[s.deliveryBtn, deliveryType === t && s.deliveryBtnActive]}>
                  <Text style={[s.deliveryBtnText, deliveryType === t && s.deliveryBtnTextActive]}>
                    {t === 'envio' ? '📦 Envío' : '🏪 Recoger'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Section>

          <Section label="Nombre completo *">
            <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Juan García" returnKeyType="next" />
          </Section>
          <Section label="Teléfono / WhatsApp *">
            <TextInput style={s.input} value={phone} onChangeText={setPhone} placeholder="55 1234 5678" keyboardType="phone-pad" returnKeyType="next" />
          </Section>
          {deliveryType === 'envio' && (
            <Section label="Dirección de entrega *">
              <TextInput style={s.input} value={address} onChangeText={setAddress} placeholder="Calle, número, colonia, municipio" multiline />
            </Section>
          )}

          <Section label="Método de pago">
            <View style={s.payRow}>
              {PAYMENT_METHODS.map((m) => (
                <TouchableOpacity key={m} onPress={() => setPayment(m)} style={[s.payBtn, payment === m && s.payBtnActive]}>
                  <Text style={[s.payBtnText, payment === m && s.payBtnTextActive]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Section>

          <Section label="Notas (opcional)">
            <TextInput style={[s.input, { minHeight: 64 }]} value={notes} onChangeText={setNotes} placeholder="Instrucciones especiales..." multiline textAlignVertical="top" />
          </Section>

          {/* Summary */}
          <View style={s.summary}>
            {items.map((i) => (
              <View key={i!.id} style={s.summaryRow}>
                <Text style={s.summaryLabel} numberOfLines={1}>{i!.name} × {i!.qty}</Text>
                <Text style={s.summaryValue}>{fmt(i!.price * i!.qty)}</Text>
              </View>
            ))}
            {shipping > 0 && (
              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>Envío</Text>
                <Text style={s.summaryValue}>{fmt(shipping)}</Text>
              </View>
            )}
            <View style={[s.summaryRow, { borderTopWidth: 1, borderTopColor: '#F3F4F6', marginTop: 8, paddingTop: 8 }]}>
              <Text style={{ fontWeight: '800', color: '#1C1917' }}>Total</Text>
              <Text style={{ fontWeight: '800', color: '#1C1917' }}>{fmt(total)}</Text>
            </View>
          </View>

          {error ? <Text style={s.error}>{error}</Text> : null}

          <TouchableOpacity style={[s.btn, loading && { opacity: 0.6 }]} onPress={submit} disabled={loading}>
            <Text style={s.btnText}>{loading ? 'Procesando...' : `Confirmar — ${fmt(total)}`}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={s.label}>{label}</Text>
      {children}
    </View>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FEFCE8' },
  scroll: { padding: 16, paddingBottom: 48 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 22, color: '#374151', lineHeight: 28 },
  title: { fontSize: 24, fontWeight: '800', color: '#1C1917' },
  label: { fontSize: 13, fontWeight: '600', color: '#6B7280', marginBottom: 6 },
  input: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#1C1917' },
  deliveryRow: { flexDirection: 'row', gap: 10 },
  deliveryBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 2, borderColor: '#E5E7EB', alignItems: 'center', backgroundColor: '#fff' },
  deliveryBtnActive: { borderColor: '#006341', backgroundColor: 'rgba(0,99,65,0.05)' },
  deliveryBtnText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  deliveryBtnTextActive: { color: '#006341' },
  payRow: { flexDirection: 'row', gap: 8 },
  payBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 2, borderColor: '#E5E7EB', alignItems: 'center', backgroundColor: '#fff' },
  payBtnActive: { borderColor: '#006341', backgroundColor: 'rgba(0,99,65,0.05)' },
  payBtnText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  payBtnTextActive: { color: '#006341' },
  summary: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#F3F4F6', marginBottom: 14 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  summaryLabel: { fontSize: 13, color: '#6B7280', flex: 1 },
  summaryValue: { fontSize: 13, fontWeight: '600', color: '#1C1917' },
  error: { color: '#CE1126', fontSize: 13, backgroundColor: 'rgba(206,17,38,0.06)', padding: 12, borderRadius: 10, marginBottom: 12 },
  btn: { backgroundColor: '#CE1126', borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
})
