import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useCartStore, cartItems, cartSubtotal } from '@/lib/cart-store'
import { useAuthStore } from '@/lib/auth-store'
import { GuestPrompt } from '@/components/GuestPrompt'
import { useProductsStore } from '@/lib/products-store'
import { usePaniniDraftStore } from '@/lib/panini-drafts'
import { PaniniCardPreview } from '@/components/PaniniCardPreview'
import { fmt } from '@/lib/data'
import { COLORS, SPACING, RADIUS, FONT, SHADOW } from '@/lib/theme'

const SHIPPING = 120

export default function CarritoScreen() {
  const user = useAuthStore((s) => s.user)
  const guest = useAuthStore((s) => s.guest)
  if (!user && guest) {
    return (
      <GuestPrompt
        title="Carrito"
        body="Necesitas una cuenta para guardar productos y hacer compras. Es gratis y solo toma 30 segundos."
        iconName="cart-outline"
      />
    )
  }

  const cart = useCartStore((s) => s.cart)
  const { add, sub, remove } = useCartStore()
  const products = useProductsStore((s) => s.products)
  const drafts = usePaniniDraftStore((s) => s.drafts)
  const items = cartItems(cart, products)
  const subtotal = cartSubtotal(cart, products)
  const total = subtotal + SHIPPING

  // Resolve a cart line item to its corresponding Mi Panini draft so the
  // thumbnail can render the actual card the user designed.
  function paniniDraftFor(id: string) {
    if (!id.startsWith('MI-PANINI-')) return null
    return drafts[id.slice('MI-PANINI-'.length)] ?? null
  }

  if (items.length === 0) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.empty}>
          <Text style={{ fontSize: 56, marginBottom: 12 }}>🛒</Text>
          <Text style={s.emptyTitle}>Your cart is empty</Text>
          <Text style={s.emptySub}>Add products from the store</Text>
          <TouchableOpacity style={s.goBtn} onPress={() => router.push('/tienda')}>
            <Text style={s.goBtnText}>Go to store</Text>
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
        ListHeaderComponent={<Text style={s.title}>Cart</Text>}
        renderItem={({ item }) => {
          const paniniDraft = paniniDraftFor(item!.id)
          return (
          <View style={s.card}>
            {paniniDraft ? (
              // Mini Panini card preview so user remembers exactly which custom
              // sticker they designed when reviewing the cart.
              <PaniniCardPreview
                cardType={paniniDraft.cardType}
                playerName={paniniDraft.playerName}
                country={paniniDraft.country}
                stats={paniniDraft.stats}
                photoUri={paniniDraft.photoPublicUrl ?? paniniDraft.photoUri ?? null}
                width={60}
              />
            ) : (
              <View style={[s.cardImg, { backgroundColor: item!.gradient[0] }]}>
                <Text style={{ fontSize: 28 }}>{item!.emoji}</Text>
              </View>
            )}
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
              <TouchableOpacity onPress={() => remove(item!.id)}><Text style={{ color: '#9CA3AF', fontSize: 12, marginTop: 4 }}>Remove</Text></TouchableOpacity>
            </View>
          </View>
          )
        }}
        ListFooterComponent={
          <View style={{ marginTop: 8 }}>
            <View style={s.summary}>
              <Row label="Subtotal" value={fmt(subtotal)} />
              <Row label="Estimated shipping" value={fmt(SHIPPING)} />
              <View style={[s.summaryRow, { borderTopWidth: 1, borderTopColor: '#F3F4F6', marginTop: 8, paddingTop: 8 }]}>
                <Text style={{ fontWeight: '800', color: '#1C1917', fontSize: 15 }}>Total</Text>
                <Text style={{ fontWeight: '800', color: '#1C1917', fontSize: 15 }}>{fmt(total)}</Text>
              </View>
            </View>
            <TouchableOpacity style={s.checkoutBtn} onPress={() => router.push('/checkout')}>
              <Text style={s.checkoutBtnText}>Continue to checkout</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/tienda')} style={{ alignItems: 'center', marginTop: 12 }}>
              <Text style={{ color: '#006341', fontWeight: '600', fontSize: 14 }}>Keep shopping</Text>
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
  safe: { flex: 1, backgroundColor: COLORS.cream },
  list: { padding: SPACING.lg, paddingBottom: SPACING.xxxl },
  title: { fontSize: FONT.size.displayXL, fontWeight: FONT.weight.black, color: COLORS.ink, marginBottom: SPACING.lg },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xxl },
  emptyTitle: { fontSize: FONT.size.displayL, fontWeight: FONT.weight.bold, color: COLORS.ink, marginBottom: SPACING.sm },
  emptySub: { fontSize: FONT.size.bodyL, color: COLORS.textMuted, marginBottom: SPACING.xxl },
  goBtn: { backgroundColor: COLORS.ink, paddingHorizontal: SPACING.xxl, paddingVertical: SPACING.md, borderRadius: RADIUS.lg },
  goBtnText: { color: COLORS.paper, fontWeight: FONT.weight.bold, fontSize: FONT.size.bodyL },
  card: { flexDirection: 'row', backgroundColor: COLORS.paper, borderRadius: RADIUS.xl, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border, gap: SPACING.md, ...SHADOW.sm },
  cardImg: { width: 64, height: 64, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1 },
  itemName: { fontSize: FONT.size.bodyM, fontWeight: FONT.weight.bold, color: COLORS.ink, lineHeight: 17 },
  itemPrice: { fontSize: FONT.size.bodyM, fontWeight: FONT.weight.bold, color: COLORS.green, marginTop: 2 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.sm },
  qtyBtn: { width: 28, height: 28, borderRadius: RADIUS.full, backgroundColor: COLORS.surface2, alignItems: 'center', justifyContent: 'center' },
  qtyBtnText: { fontSize: FONT.size.bodyL, fontWeight: FONT.weight.bold, color: COLORS.ink },
  qty: { fontSize: FONT.size.bodyL, fontWeight: FONT.weight.bold, color: COLORS.ink, minWidth: 20, textAlign: 'center' },
  cardRight: { alignItems: 'flex-end', justifyContent: 'center' },
  lineTotal: { fontSize: FONT.size.bodyL, fontWeight: FONT.weight.black, color: COLORS.ink },
  summary: { backgroundColor: COLORS.paper, borderRadius: RADIUS.xl, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border, ...SHADOW.sm },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.xs },
  checkoutBtn: { backgroundColor: COLORS.ink, borderRadius: RADIUS.lg, paddingVertical: SPACING.lg, alignItems: 'center', marginTop: SPACING.md },
  checkoutBtnText: { color: COLORS.paper, fontWeight: FONT.weight.bold, fontSize: FONT.size.displayM },
})
