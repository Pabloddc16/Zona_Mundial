/**
 * /shop/star/:slug — player detail with 4 rarity options (Base / Bronze /
 * Silver / Gold). Tap a rarity → adds that SKU to cart, shows confirmation.
 */
import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { STAR_PLAYERS, type StarTier } from '@/lib/star-players'
import { STAR_RARITIES, STAR_PRICING, RARITY_DISPLAY, isAvailable, type StarRarity } from '@/lib/pricing'
import { fmt, playerDisplayName, playerDisplayCountry, playerDisplayInitial } from '@/lib/data'
import { useCartStore } from '@/lib/cart-store'
import { COLORS, SPACING, RADIUS, FONT, SHADOW } from '@/lib/theme'

const TIER_DISPLAY: Record<StarTier, { color: string; bg: string }> = {
  GOAT:  { color: '#0B1F15', bg: '#FFD100' },
  CRACK: { color: '#FAF6EE', bg: '#0B1F15' },
  STAR:  { color: '#FAF6EE', bg: '#006341' },
}

export default function StarDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const add = useCartStore((s) => s.add)
  const [added, setAdded] = useState<StarRarity | null>(null)

  const player = STAR_PLAYERS.find((p) => p.slug === slug)

  if (!player) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.empty}>
          <Text style={s.emptyText}>Player not found</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ color: COLORS.green, fontWeight: '800' }}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  const tt = TIER_DISPLAY[player.tier]

  function pick(rarity: StarRarity) {
    add(`STAR-${player!.slug}-${rarity}`)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
    setAdded(rarity)
    setTimeout(() => setAdded(null), 1500)
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
        </TouchableOpacity>
        <Text style={s.title}>Pick a rarity</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {/* Player hero */}
        <View style={s.hero}>
          <View style={s.avatarBig}>
            <Text style={s.avatarText}>{playerDisplayInitial(player)}</Text>
          </View>
          <View style={[s.tierBadge, { backgroundColor: tt.bg }]}>
            <Text style={[s.tierBadgeText, { color: tt.color }]}>{player.tier}</Text>
          </View>
          <Text style={s.playerName}>{playerDisplayName(player)}</Text>
          <Text style={s.country}>{playerDisplayCountry(player)}</Text>
        </View>

        {/* Rarity options */}
        <Text style={s.sectionLabel}>CHOOSE YOUR RARITY</Text>
        <View style={s.rarityList}>
          {STAR_RARITIES.filter((r) => isAvailable(player.tier, r)).map((r) => {
            const d = RARITY_DISPLAY[r]
            const price = STAR_PRICING[player.tier][r]
            const isAdded = added === r
            return (
              <TouchableOpacity
                key={r}
                onPress={() => pick(r)}
                activeOpacity={0.85}
                style={[s.rarityCard, { borderColor: d.color, backgroundColor: d.bg }]}
              >
                <View style={[s.rarityCircle, { backgroundColor: d.color }]}>
                  <Text style={[s.rarityCircleText, { color: d.bg }]}>{d.label[0]}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.rarityLabel, { color: d.color }]}>{d.label}</Text>
                  <Text style={s.rarityPrice}>{fmt(price)}</Text>
                </View>
                {isAdded ? (
                  <View style={s.addedPill}>
                    <Ionicons name="checkmark-circle" size={16} color={COLORS.paper} />
                    <Text style={s.addedText}>Added</Text>
                  </View>
                ) : (
                  <View style={[s.addBtn, { backgroundColor: d.color }]}>
                    <Ionicons name="add" size={18} color={d.bg} />
                  </View>
                )}
              </TouchableOpacity>
            )
          })}
        </View>

        <Text style={s.note}>Each rarity is a separate physical sticker. Cards can be combined in one order.</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.cream },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '900', color: COLORS.ink },

  scroll: { padding: SPACING.lg, paddingBottom: SPACING.xxxl },

  hero: { alignItems: 'center', gap: 6, marginBottom: SPACING.xl },
  avatarBig: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: COLORS.ink,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.sm,
    ...SHADOW.md,
  },
  avatarText: { fontSize: 40, fontWeight: '900', color: COLORS.gold },
  tierBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  tierBadgeText: { fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  playerName: { fontSize: 28, fontWeight: '900', color: COLORS.ink, letterSpacing: -0.5, marginTop: 6 },
  country: { fontSize: 13, color: COLORS.textMuted, fontWeight: '700' },

  sectionLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 2, color: COLORS.textMuted, marginBottom: SPACING.sm, paddingHorizontal: 2 },

  rarityList: { gap: SPACING.sm, marginBottom: SPACING.lg },
  rarityCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
  },
  rarityCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  rarityCircleText: { fontSize: 20, fontWeight: '900' },
  rarityLabel: { fontSize: 17, fontWeight: '900' },
  rarityPrice: { fontSize: 14, fontWeight: '800', color: COLORS.ink, marginTop: 2 },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  addedPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.green,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 99,
  },
  addedText: { fontSize: 12, fontWeight: '900', color: COLORS.paper },

  note: { fontSize: 11, color: COLORS.textMuted, textAlign: 'center', marginTop: SPACING.sm },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md },
  emptyText: { fontSize: 16, color: COLORS.textMuted },
})
