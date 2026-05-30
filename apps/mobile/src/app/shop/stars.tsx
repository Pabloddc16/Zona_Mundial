/**
 * /shop/stars — 20 player cards. Tap a player → opens detail page that lets
 * the user pick a rarity (Base / Bronze / Silver / Gold) and add the
 * specific SKU to cart.
 */
import { useMemo, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { STAR_PLAYERS, type StarTier } from '@/lib/star-players'
import { STAR_PRICING } from '@/lib/pricing'
import { fmt, playerDisplayName, playerDisplayCountry, playerDisplayInitial } from '@/lib/data'
import { COLORS, SPACING, RADIUS, FONT, SHADOW } from '@/lib/theme'

type TierFilter = 'all' | StarTier

const TIER_DISPLAY: Record<StarTier, { color: string; bg: string }> = {
  GOAT:  { color: '#0B1F15', bg: '#FFD100' },
  CRACK: { color: '#FAF6EE', bg: '#0B1F15' },
  STAR:  { color: '#FAF6EE', bg: '#006341' },
}

export default function StarsShopScreen() {
  const [tier, setTier] = useState<TierFilter>('all')

  const players = useMemo(() => {
    return STAR_PLAYERS.filter((p) => tier === 'all' || p.tier === tier)
  }, [tier])

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
        </TouchableOpacity>
        <View>
          <Text style={s.titleSmall}>Store · Stars</Text>
          <Text style={s.titleBig}>20 players</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <View style={s.filterRow}>
        {(['all', 'GOAT', 'CRACK', 'STAR'] as TierFilter[]).map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setTier(t)}
            style={[s.chip, tier === t && s.chipActive]}
          >
            <Text style={[s.chipText, tier === t && s.chipTextActive]}>
              {t === 'all' ? 'All tiers' : t}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.grid}>
          {players.map((p) => {
            const tt = TIER_DISPLAY[p.tier]
            const basePrice = STAR_PRICING[p.tier].BASE
            return (
              <TouchableOpacity
                key={p.slug}
                onPress={() => router.push(`/shop/star/${p.slug}`)}
                activeOpacity={0.85}
                style={s.card}
              >
                <View style={[s.tierBadge, { backgroundColor: tt.bg }]}>
                  <Text style={[s.tierBadgeText, { color: tt.color }]}>{p.tier}</Text>
                </View>
                <View style={s.avatar}>
                  <Text style={s.avatarText}>{playerDisplayInitial(p)}</Text>
                </View>
                <Text style={s.playerName} numberOfLines={1}>{playerDisplayName(p)}</Text>
                <Text style={s.country}>{playerDisplayCountry(p)}</Text>
                <Text style={s.fromPrice}>from {fmt(basePrice)}</Text>
                <View style={s.rarities}>
                  <View style={[s.rarityDot, { backgroundColor: '#FAF6EE', borderColor: '#0B1F15' }]} />
                  <View style={[s.rarityDot, { backgroundColor: '#F5E3D2', borderColor: '#7A4A1F' }]} />
                  <View style={[s.rarityDot, { backgroundColor: '#EEF2F6', borderColor: '#9CA3AF' }]} />
                  <View style={[s.rarityDot, { backgroundColor: '#FFF8DC', borderColor: '#FFD100' }]} />
                </View>
              </TouchableOpacity>
            )
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.cream },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  titleSmall: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  titleBig: { fontSize: 18, fontWeight: '900', color: COLORS.ink },

  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  chip: {
    backgroundColor: COLORS.paper,
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 99,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  chipActive: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  chipText: { fontSize: 12, fontWeight: '800', color: COLORS.ink },
  chipTextActive: { color: COLORS.paper },

  scroll: { padding: SPACING.lg, paddingBottom: SPACING.xxxl },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md, justifyContent: 'space-between' },
  card: {
    width: '47%',
    backgroundColor: COLORS.paper,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'flex-start',
    gap: 4,
    ...SHADOW.sm,
  },
  tierBadge: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  tierBadgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.surface2,
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center',
    marginVertical: SPACING.sm,
  },
  avatarText: { fontSize: 24, fontWeight: '900', color: COLORS.ink },
  playerName: { fontSize: 15, fontWeight: '900', color: COLORS.ink },
  country: { fontSize: 11, color: COLORS.textMuted, marginBottom: 4 },
  fromPrice: { fontSize: 13, fontWeight: '800', color: COLORS.green },
  rarities: { flexDirection: 'row', gap: 4, marginTop: 6 },
  rarityDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1.5 },
})
