import { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { Ionicons } from '@expo/vector-icons'
import { useCartStore, cartItems, cartSubtotal } from '@/lib/cart-store'
import { useProductsStore } from '@/lib/products-store'
import { api, type OrderPayload } from '@/lib/api'
import { fmt } from '@/lib/data'
import { COLORS, SPACING, RADIUS, FONT } from '@/lib/theme'
import { AddressForm, emptyAddress, type AddressValue } from '@/components/AddressForm'
import {
  DELIVERY_LABEL,
  DELIVERY_SUB,
  deliveryAmountToFreeShipping,
  deliveryFee,
  STORE_ADDRESS,
  WELCOME_CREDIT_MXN,
  maxReferralApplied,
  type DeliveryZone,
  type PaymentMethod,
} from '@/lib/delivery'

export default function CheckoutScreen() {
  const cart = useCartStore((s) => s.cart)
  const clear = useCartStore((s) => s.clear)
  const products = useProductsStore((s) => s.products)
  const items = cartItems(cart, products)
  const subtotal = cartSubtotal(cart, products)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState<AddressValue>(emptyAddress())
  const [notes, setNotes] = useState('')
  const [zone, setZone] = useState<DeliveryZone>('gdl')
  const payment: PaymentMethod = 'card'  // Pablo: card-only everywhere via MP
  // Stub credits — wire to backend in Phase 5/8
  const [welcomeApplied] = useState(WELCOME_CREDIT_MXN)
  const [referralBalance] = useState(0)
  const [useReferralCredit, setUseReferralCredit] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const shipping = deliveryFee(zone, subtotal)
  const remainingForFree = deliveryAmountToFreeShipping(zone, subtotal)
  const refApplied = useReferralCredit ? maxReferralApplied(subtotal, welcomeApplied, referralBalance) : 0
  const totalDiscount = welcomeApplied + refApplied
  const total = Math.max(0, subtotal - totalDiscount) + shipping

  async function submit() {
    if (!name.trim() || !phone.trim()) { setError('Name and phone are required'); return }
    if (zone !== 'pickup' && !address.formatted.trim()) { setError('Address is required for delivery'); return }
    if (items.length === 0) { setError('Your cart is empty'); return }
    setLoading(true)
    setError('')
    try {
      const notesVal = notes.trim()
      const payload: OrderPayload = {
        customer_name: name.trim(),
        phone: phone.trim(),
        address: address.formatted.trim(),
        delivery_type: zone === 'pickup' ? 'local' : 'envio',
        payment_method: payment === 'card' ? 'tarjeta' : 'efectivo',
        shipping,
        items: items.map((i) => ({ product_id: i!.id, name: i!.name, qty: i!.qty, price: i!.price })),
        ...(notesVal ? { notes: notesVal } : {}),
      }
      const order = await api.orders.create(payload)
      clear()
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
      // TODO Phase 7: if payment=card, redirect to Mercado Pago init_point here
      router.replace(`/orden/${order.order_number}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not place order')
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
              <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
            </TouchableOpacity>
            <Text style={s.title}>Checkout</Text>
          </View>

          {/* CONTACT */}
          <Group label="Contact">
            <Card>
              <Field label="Name">
                <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Your full name" autoComplete="name" returnKeyType="next" />
              </Field>
              <Field label="Phone / WhatsApp">
                <TextInput style={s.input} value={phone} onChangeText={setPhone} placeholder="33 1234 5678" autoComplete="tel" keyboardType="phone-pad" returnKeyType="next" />
              </Field>
            </Card>
          </Group>

          {/* DELIVERY */}
          <Group label="Delivery">
            <View style={s.zoneRow}>
              {(['gdl', 'nacional', 'pickup'] as DeliveryZone[]).map((z) => (
                <TouchableOpacity key={z} onPress={() => setZone(z)} style={[s.zoneBtn, zone === z && s.zoneBtnActive]}>
                  <Ionicons
                    name={z === 'gdl' ? 'bicycle-outline' : z === 'nacional' ? 'cube-outline' : 'storefront-outline'}
                    size={20}
                    color={zone === z ? COLORS.paper : COLORS.ink}
                  />
                  <Text style={[s.zoneBtnText, zone === z && s.zoneBtnTextActive]}>
                    {z === 'gdl' ? 'Local' : z === 'nacional' ? 'Mexico' : 'Pickup'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Card>
              <View style={s.line}>
                <Text style={s.lineLabel}>{DELIVERY_LABEL[zone]}</Text>
                <Text style={[s.lineValue, shipping === 0 && { color: COLORS.green }]}>
                  {shipping === 0 ? 'Free' : fmt(shipping)}
                </Text>
              </View>
              <Text style={s.lineSub}>{DELIVERY_SUB[zone]}</Text>
              {remainingForFree > 0 && (
                <Text style={s.freeShipHint}>Add {fmt(remainingForFree)} more for free shipping</Text>
              )}
              {zone !== 'pickup' && (
                <AddressForm value={address} onChange={setAddress} />
              )}
              {zone === 'pickup' && (
                <View style={s.pickupCard}>
                  <View style={s.pickupHeader}>
                    <Ionicons name="storefront" size={18} color={COLORS.green} />
                    <Text style={s.pickupTitle}>Pickup location</Text>
                  </View>
                  <Text style={s.pickupLine}>{STORE_ADDRESS.line1}</Text>
                  <Text style={s.pickupLine}>{STORE_ADDRESS.line2}</Text>
                  <Text style={s.pickupLine}>{STORE_ADDRESS.zip} · {STORE_ADDRESS.city}</Text>
                  <Text style={s.pickupHours}>{STORE_ADDRESS.hours}</Text>
                  <Text style={s.pickupHint}>After payment, you'll get a pickup code. Show it at the counter.</Text>
                </View>
              )}
            </Card>
          </Group>

          {/* PAYMENT — card-only via Mercado Pago, no toggle */}
          <Group label="Payment method">
            <View style={[s.payBtn, s.payBtnActive, { flexDirection: 'row', justifyContent: 'center', gap: 12 }]}>
              <Ionicons name="card-outline" size={22} color={COLORS.paper} />
              <Text style={[s.payBtnText, s.payBtnTextActive]}>Card · Mercado Pago</Text>
            </View>
          </Group>

          {/* CREDITS */}
          {(welcomeApplied > 0 || referralBalance > 0) && (
            <Group label="Discounts">
              <Card>
                {welcomeApplied > 0 && (
                  <View style={s.line}>
                    <Text style={s.lineLabel}>🎁 Welcome credit</Text>
                    <Text style={[s.lineValue, { color: COLORS.green }]}>−{fmt(welcomeApplied)}</Text>
                  </View>
                )}
                {referralBalance > 0 && (
                  <>
                    <View style={s.line}>
                      <Text style={s.lineLabel}>💸 Referral balance</Text>
                      <Text style={s.lineValue}>{fmt(referralBalance)}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setUseReferralCredit((v) => !v)} style={s.toggleRow}>
                      <View style={[s.checkbox, useReferralCredit && s.checkboxOn]}>
                        {useReferralCredit && <Ionicons name="checkmark" size={14} color={COLORS.paper} />}
                      </View>
                      <Text style={s.toggleLabel}>Apply {fmt(refApplied)} to this order</Text>
                    </TouchableOpacity>
                  </>
                )}
              </Card>
            </Group>
          )}

          {/* NOTES */}
          <Group label="Notes (optional)">
            <Card>
              <TextInput
                style={[s.input, { minHeight: 60, borderWidth: 0, paddingHorizontal: 0 }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Special instructions for the delivery person..."
                multiline
                textAlignVertical="top"
              />
            </Card>
          </Group>

          {/* SUMMARY */}
          <Group label="Order summary">
            <Card>
              {items.map((i) => (
                <View key={i!.id} style={s.line}>
                  <Text style={s.lineLabel} numberOfLines={1}>{i!.qty}× {i!.name}</Text>
                  <Text style={s.lineValue}>{fmt(i!.price * i!.qty)}</Text>
                </View>
              ))}
              <View style={s.divider} />
              <View style={s.line}>
                <Text style={s.lineLabel}>Subtotal</Text>
                <Text style={s.lineValue}>{fmt(subtotal)}</Text>
              </View>
              <View style={s.line}>
                <Text style={s.lineLabel}>Shipping</Text>
                <Text style={[s.lineValue, shipping === 0 && { color: COLORS.green }]}>
                  {shipping === 0 ? 'Free' : fmt(shipping)}
                </Text>
              </View>
              {welcomeApplied > 0 && (
                <View style={s.line}>
                  <Text style={[s.lineLabel, { color: COLORS.green }]}>Welcome credit</Text>
                  <Text style={[s.lineValue, { color: COLORS.green }]}>−{fmt(welcomeApplied)}</Text>
                </View>
              )}
              {refApplied > 0 && (
                <View style={s.line}>
                  <Text style={[s.lineLabel, { color: COLORS.green }]}>Referral credit</Text>
                  <Text style={[s.lineValue, { color: COLORS.green }]}>−{fmt(refApplied)}</Text>
                </View>
              )}
              <View style={s.dividerThick} />
              <View style={s.line}>
                <Text style={s.totalLabel}>Total</Text>
                <Text style={s.totalValue}>{fmt(total)}</Text>
              </View>
            </Card>
          </Group>

          {error ? <Text style={s.error}>{error}</Text> : null}

          <TouchableOpacity style={[s.payBtnMain, loading && { opacity: 0.6 }]} onPress={submit} disabled={loading}>
            <Text style={s.payBtnMainText}>
              {loading ? 'Processing…' : `Pay ${fmt(total)} ${payment === 'card' ? '→' : '· at pickup'}`}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: SPACING.lg }}>
      <Text style={s.groupTitle}>{label.toUpperCase()}</Text>
      {children}
    </View>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return <View style={s.card}>{children}</View>
}

function Field({ label, children, topGap }: { label: string; children: React.ReactNode; topGap?: boolean }) {
  return (
    <View style={[topGap && { marginTop: SPACING.md }]}>
      <Text style={s.fieldLabel}>{label}</Text>
      {children}
    </View>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.cream },
  scroll: { padding: SPACING.lg, paddingBottom: SPACING.xxxl },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.lg },
  backBtn: { width: 40, height: 40, borderRadius: RADIUS.md, backgroundColor: COLORS.paper, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  title: { fontSize: 26, fontWeight: FONT.weight.black, color: COLORS.ink },

  groupTitle: { fontSize: 11, fontWeight: FONT.weight.bold, letterSpacing: 1.5, color: COLORS.textMuted, marginBottom: SPACING.sm, paddingHorizontal: 2 },
  card: { backgroundColor: COLORS.paper, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  fieldLabel: { fontSize: 12, fontWeight: FONT.weight.medium, color: COLORS.textMuted, marginBottom: 6 },
  input: { backgroundColor: '#fff', borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: COLORS.ink },

  /* Zone selector */
  zoneRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  zoneBtn: { flex: 1, paddingVertical: SPACING.md, borderRadius: RADIUS.md, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center', backgroundColor: COLORS.paper, gap: 4 },
  zoneBtnActive: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  zoneBtnText: { fontSize: 13, fontWeight: FONT.weight.bold, color: COLORS.ink },
  zoneBtnTextActive: { color: COLORS.paper },

  /* Lines inside cards */
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  lineLabel: { fontSize: 14, color: COLORS.textMuted, flex: 1 },
  lineValue: { fontSize: 14, fontWeight: FONT.weight.bold, color: COLORS.ink },
  lineSub: { fontSize: 12, color: COLORS.textFaint, marginTop: 2 },
  freeShipHint: { fontSize: 12, color: COLORS.green, fontWeight: FONT.weight.medium, marginTop: 6 },
  divider: { height: 1, backgroundColor: COLORS.borderSoft, marginVertical: SPACING.sm },
  dividerThick: { height: 2, backgroundColor: COLORS.ink, marginVertical: SPACING.sm },
  totalLabel: { fontSize: 16, fontWeight: FONT.weight.black, color: COLORS.ink },
  totalValue: { fontSize: 20, fontWeight: FONT.weight.black, color: COLORS.green },

  /* Payment */
  payRow: { flexDirection: 'row', gap: SPACING.sm },
  payBtn: { flex: 1, paddingVertical: SPACING.md, borderRadius: RADIUS.md, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center', backgroundColor: COLORS.paper, gap: 4 },
  payBtnActive: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  payBtnDisabled: { opacity: 0.5 },
  payBtnText: { fontSize: 14, fontWeight: FONT.weight.bold, color: COLORS.ink },
  payBtnTextActive: { color: COLORS.paper },
  payBtnTextDisabled: { color: COLORS.textFaint },
  payBadge: { fontSize: 10, color: COLORS.textMuted, marginTop: 2, fontWeight: FONT.weight.medium },

  /* Toggle */
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.sm },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: COLORS.borderStrong, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: COLORS.green, borderColor: COLORS.green },
  toggleLabel: { fontSize: 13, color: COLORS.ink, fontWeight: FONT.weight.medium },

  error: { color: COLORS.red, fontSize: 13, backgroundColor: 'rgba(206,17,38,0.06)', padding: 12, borderRadius: RADIUS.md, marginBottom: SPACING.md },

  payBtnMain: { backgroundColor: COLORS.ink, borderRadius: RADIUS.full, paddingVertical: 18, alignItems: 'center' },
  payBtnMainText: { color: COLORS.paper, fontWeight: FONT.weight.black, fontSize: 16 },

  /* Pickup store-address card */
  pickupCard: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(0,99,65,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(0,99,65,0.18)',
  },
  pickupHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.sm },
  pickupTitle: { fontSize: 13, fontWeight: '900', color: COLORS.green, letterSpacing: 0.5 },
  pickupLine: { fontSize: 14, fontWeight: '700', color: COLORS.ink, lineHeight: 19 },
  pickupHours: { fontSize: 12, color: COLORS.textMuted, marginTop: 6, fontWeight: '600' },
  pickupHint: { fontSize: 11, color: COLORS.textFaint, marginTop: 8, fontStyle: 'italic' },
})
