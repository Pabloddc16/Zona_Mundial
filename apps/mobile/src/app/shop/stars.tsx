/**
 * /shop/stars — Stars SKU catalog (20 players × 4 rarity tiers = 80 SKUs).
 * Filter by player tier (GOAT/CRACK/STAR) or by rarity (BASE/BRONCE/PLATA/ORO).
 */
import { useMemo, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, FlatList } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { STAR_PLAYERS, type StarTier } from '@/lib/star-players'
import { STAR_RARITIES, STAR_PRICING, RARITY_DISPLAY, type StarRarity } from '@/lib/pricing'
import { fmt } from '@/lib/data'
import { useCartStore } from '@/lib/cart-store'
import { COLORS, SPACING, RADIUS, FONT, SHADOW } from '@/lib/theme'

type TierFilter = 'all' | StarTier
type RarityFilter = 'all' | StarRarity

interface Sku {
  id: string
  playerSlug: string
  playerName: string
  country: string
  tier: StarTier
  rarity: StarRarity
  price: number
}

const TIER_DISPLAY: Record<StarTier, { color: string; bg: string }> = {
  GOAT:  { color: '#0B1F15', bg: '#FFD100' },
  CRACK: { color: '#FAF6EE', bg: '#0B1F15' },
  STAR:  { color: '#FAF6EE', bg: '#006341' },
}

export default function StarsShopScreen() {
  const [tier, setTier] = useState<TierFilter>('all')
  const [rarity, setRarity] = useState<RarityFilter>('all')
  const add = useCartStore((s) => s.add)

  const skus = useMemo<Sku[]>(() => {
    const out: Sku[] = []
    for (const p of STAR_PLAYERS) {
      for (const r of STAR_RARITIES) {
        if (tier !== 'all' && p.tier !== tier) continue
        if (rarity !== 'all' && r !== rarity) continue
        out.push({
          id: `STAR-${p.slug}-${r}`,
          playerSlug: p.slug,
          playerName: p.name,
          country: p.country,
          tier: p.tier,
          rarity: r,
          price: STAR_PRICING[p.tier][r],
        })
      }
    }
    return out
  }, [tier, rarity])

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
        </TouchableOpacity>
        <View>
          <Text style={s.titleSmall}>Tienda · Stars</Text>
          <Text style={s.titleBig}>20 jugadores · 4 tiers</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Tier filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
        {(['all', 'GOAT', 'CRACK', 'STAR'] as TierFilter[]).map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setTier(t)}
            style={[s.chip, tier === t && s.chipActive]}
          >
            <Text style={[s.chipText, tier === t && s.chipTextActive]}>
              {t === 'all' ? 'Todos los tiers' : t}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Rarity filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
        {(['all', ...STAR_RARITIES] as RarityFilter[]).map((r) => (
          <TouchableOpacity
            key={r}
            onPress={() => setRarity(r)}
            style={[
              s.chip,
              rarity === r && s.chipActive,
              r !== 'all' && rarity === r && { backgroundColor: RARITY_DISPLAY[r as StarRarity].color },
            ]}
          >
            <Text style={[s.chipText, rarity === r && s.chipTextActive]}>
              {r === 'all' ? 'Todas las rarezas' : RARITY_DISPLAY[r as StarRarity].label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={skus}
        keyExtractor={(sku) => sku.id}
        contentContainerStyle={s.list}
        numColumns={2}
        columnWrapperStyle={s.row2col}
        renderItem={({ item }) => {
          const r = RARITY_DISPLAY[item.rarity]
          const tt = TIER_DISPLAY[item.tier]
          return (
            <View style={[s.card, { borderColor: r.color }]}>
              <View style={[s.tierBadge, { backgroundColor: tt.bg }]}>
                <Text style={[s.tierBadgeText, { color: tt.color }]}>{item.tier}</Text>
              </View>
              <View style={[s.rarityChip, { backgroundColor: r.bg, borderColor: r.color }]}>
                <Text style={[s.rarityChipText, { color: r.color }]}>{r.label}</Text>
              </View>
              <Text style={s.playerName} numberOfLines={1}>{item.playerName}</Text>
              <Text style={s.country}>{item.country}</Text>
              <View style={s.footer}>
                <Text style={s.price}>{fmt(item.price)}</Text>
                <TouchableOpacity
                  onPress={() => add(item.id)}
                  style={s.addBtn}
                  hitSlop={6}
                >
                  <Ionicons name="add" size={18} color={COLORS.paper} />
                </TouchableOpacity>
              </View>
            </View>
          )
        }}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="filter-outline" size={32} color={COLORS.textMuted} />
            <Text style={s.emptyText}>Sin SKUs en este filtro</Text>
          </View>
        }
      />
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
  titleBig: { fontSize: 16, fontWeight: '900', color: COLORS.ink },

  chipRow: { paddingHorizontal: SPACING.lg, gap: 8, paddingVertical: 8 },
  chip: {
    backgroundColor: COLORS.paper,
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 99,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  chipActive: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  chipText: { fontSize: 12, fontWeight: '800', color: COLORS.ink },
  chipTextActive: { color: COLORS.paper },

  list: { padding: SPACING.lg, gap: SPACING.md },
  row2col: { gap: SPACING.md, marginBottom: SPACING.md },
  card: {
    width: '47%',
    backgroundColor: COLORS.paper,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    gap: 4,
    ...SHADOW.sm,
  },
  tierBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  tierBadgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  rarityChip: {
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 99,
  },
  rarityChipText: { fontSize: 10, fontWeight: '800' },
  playerName: { fontSize: 15, fontWeight: '900', color: COLORS.ink, marginTop: 6 },
  country: { fontSize: 11, color: COLORS.textMuted, marginBottom: 4 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  price: { fontSize: 14, fontWeight: FONT.weight.black, color: COLORS.green },
  addBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.ink, alignItems: 'center', justifyContent: 'center' },

  empty: { alignItems: 'center', paddingVertical: SPACING.xxxl, gap: SPACING.sm },
  emptyText: { fontSize: 13, color: COLORS.textMuted },
})
