import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { groupById, fmt } from '@/lib/data'
import { useAlbumStore } from '@/lib/album-store'
import { useCartStore } from '@/lib/cart-store'

export default function GroupScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>()
  const group = groupById(groupId)
  const album = useAlbumStore((s) => s.album)
  const markOwned = useAlbumStore((s) => s.markOwned)
  const markNeeded = useAlbumStore((s) => s.markNeeded)
  const addToCart = useCartStore((s) => s.add)

  if (!group) return <SafeAreaView><Text>Not found</Text></SafeAreaView>

  const gs = album[groupId] ?? {}

  function handleOwned(n: number) {
    const delta = (gs[n]?.owned ?? 0) > 0 ? -1 : 1
    markOwned(groupId, n, delta)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {})
  }

  function handleNeeded(n: number) {
    const delta = (gs[n]?.needed ?? 0) > 0 ? -1 : 1
    markNeeded(groupId, n, delta)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
  }

  const missing = group.stickers.filter((s) => !((gs[s.n]?.owned ?? 0) > 0))

  function addMissingToCart() {
    missing.forEach(() => addToCart('CARTA-SUELTA', 1))
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
  }

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backIcon}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 24 }}>{group.emoji}</Text>
            <Text style={s.headerTitle} numberOfLines={1}>{group.name}</Text>
          </View>
          <Text style={s.headerSub}>{group.subtitle} · {group.stickers.length} stickers</Text>
        </View>
      </View>

      {missing.length > 0 && (
        <TouchableOpacity style={s.missingBanner} onPress={addMissingToCart}>
          <Text style={s.missingText}>You're missing {missing.length} stickers</Text>
          <Text style={s.missingBtn}>Add to cart</Text>
        </TouchableOpacity>
      )}

      <ScrollView contentContainerStyle={s.grid}>
        {group.stickers.map((st) => {
          const state = gs[st.n] ?? { owned: 0, needed: 0 }
          const owned = state.owned > 0
          const needed = state.needed > 0
          const extra = state.owned > 1
          return (
            <View key={st.n} style={[s.card, owned ? s.cardOwned : needed ? s.cardNeeded : s.cardDefault]}>
              <Text style={s.code}>{st.code}</Text>
              <Text style={s.label} numberOfLines={2}>{st.label}</Text>
              <Text style={s.price}>{fmt(st.price)}</Text>
              {extra && <Text style={s.extraBadge}>+{state.owned - 1}</Text>}
              <View style={s.btnRow}>
                <TouchableOpacity onPress={() => handleOwned(st.n)} style={[s.stickerBtn, owned ? s.stickerBtnOwned : s.stickerBtnGray]}>
                  <Text style={[s.stickerBtnText, owned && { color: '#fff' }]}>{owned ? '✓' : 'Have'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleNeeded(st.n)} style={[s.stickerBtn, needed ? s.stickerBtnNeeded : s.stickerBtnGray]}>
                  <Text style={[s.stickerBtnText, needed && { color: '#1C1917' }]}>{needed ? '★' : 'Need'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )
        })}
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FEFCE8' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 22, color: '#374151', lineHeight: 28 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1C1917', flex: 1 },
  headerSub: { fontSize: 12, color: '#9CA3AF', marginTop: 1 },
  missingBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', margin: 12, backgroundColor: 'rgba(206,17,38,0.06)', borderWidth: 1, borderColor: 'rgba(206,17,38,0.2)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  missingText: { fontSize: 13, fontWeight: '600', color: '#CE1126' },
  missingBtn: { fontSize: 12, fontWeight: '700', color: '#fff', backgroundColor: '#CE1126', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 10, gap: 8, paddingBottom: 32 },
  card: { width: '30.5%', borderRadius: 12, padding: 10, borderWidth: 2, alignItems: 'center' },
  cardDefault: { borderColor: '#E5E7EB', backgroundColor: '#fff' },
  cardOwned: { borderColor: '#006341', backgroundColor: 'rgba(0,99,65,0.04)' },
  cardNeeded: { borderColor: '#FFD100', backgroundColor: 'rgba(255,209,0,0.06)' },
  code: { fontSize: 9, fontFamily: 'monospace', color: '#9CA3AF', marginBottom: 2 },
  label: { fontSize: 11, fontWeight: '600', color: '#1C1917', textAlign: 'center', lineHeight: 14, marginBottom: 3 },
  price: { fontSize: 10, color: '#9CA3AF', marginBottom: 4 },
  extraBadge: { fontSize: 10, fontWeight: '800', color: '#92400E', marginBottom: 3 },
  btnRow: { flexDirection: 'row', gap: 4, width: '100%' },
  stickerBtn: { flex: 1, paddingVertical: 4, borderRadius: 6, alignItems: 'center' },
  stickerBtnOwned: { backgroundColor: '#006341' },
  stickerBtnNeeded: { backgroundColor: '#FFD100' },
  stickerBtnGray: { backgroundColor: '#F3F4F6' },
  stickerBtnText: { fontSize: 10, fontWeight: '700', color: '#6B7280' },
})
