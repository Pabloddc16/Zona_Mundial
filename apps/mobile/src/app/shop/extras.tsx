/**
 * /shop/extras — rarity-filtered single-sticker catalog.
 * Lets users buy individual hard-to-find stickers (foil crests, FWC specials,
 * Coca-Cola promo) one at a time.
 */
import { useMemo, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, FlatList } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { ALBUM, fmt, type Rarity, groupDisplayName, groupDisplayEmoji } from '@/lib/data'
import { COLORS, SPACING, RADIUS, FONT, SHADOW } from '@/lib/theme'

type Filter = 'all' | 'foil' | 'special' | 'gold'

const FILTERS: { id: Filter; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'all',     label: 'All',           icon: 'apps-outline' },
  { id: 'foil',    label: 'Foil',          icon: 'star-outline' },
  { id: 'special', label: 'Limited Ed.',   icon: 'sparkles-outline' },
  { id: 'gold',    label: 'Legendary',     icon: 'trophy-outline' },
]

export default function ExtrasScreen() {
  const [filter, setFilter] = useState<Filter>('all')

  const items = useMemo(() => {
    const out: { groupId: string; groupName: string; emoji: string; code: string; label: string; price: number; rarity: Rarity }[] = []
    for (const g of ALBUM) {
      for (const st of g.stickers) {
        const r = (st.rarity ?? 'common') as Rarity
        if (r === 'common') continue
        if (filter !== 'all' && r !== filter) continue
        out.push({
          groupId: g.id,
          groupName: groupDisplayName(g),
          emoji: groupDisplayEmoji(g),
          code: st.code,
          label: st.label,
          price: st.price,
          rarity: r,
        })
      }
    }
    return out
  }, [filter])

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
        </TouchableOpacity>
        <Text style={s.title}>Extra Stickers</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.id}
            onPress={() => setFilter(f.id)}
            style={[s.filter, filter === f.id && s.filterActive]}
          >
            <Ionicons name={f.icon} size={14} color={filter === f.id ? COLORS.paper : COLORS.ink} />
            <Text style={[s.filterLabel, filter === f.id && s.filterLabelActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={items}
        keyExtractor={(it) => it.code}
        contentContainerStyle={s.list}
        renderItem={({ item }) => (
          <View style={s.row}>
            <View style={[s.badge, item.rarity === 'foil' && s.badgeFoil, item.rarity === 'gold' && s.badgeGold, item.rarity === 'special' && s.badgeSpecial]}>
              <Text style={s.badgeCode}>{item.code}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.rowLabel} numberOfLines={1}>{item.label}</Text>
              <Text style={s.rowGroup} numberOfLines={1}>{item.emoji} {item.groupName}</Text>
            </View>
            <Text style={s.rowPrice}>{fmt(item.price)}</Text>
            <TouchableOpacity style={s.addBtn} hitSlop={6}>
              <Ionicons name="add" size={16} color={COLORS.paper} />
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="sparkles-outline" size={32} color={COLORS.textMuted} />
            <Text style={s.emptyText}>No stickers match this filter</Text>
          </View>
        }
      />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.cream },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '900', color: COLORS.ink },
  filterRow: { paddingHorizontal: SPACING.lg, gap: SPACING.sm, paddingVertical: SPACING.sm },
  filter: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.paper, borderWidth: 1, borderColor: COLORS.border, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 8 },
  filterActive: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  filterLabel: { fontSize: 12, fontWeight: '800', color: COLORS.ink },
  filterLabelActive: { color: COLORS.paper },
  list: { padding: SPACING.lg, gap: SPACING.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: COLORS.paper, padding: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border },
  badge: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.border },
  badgeFoil:    { borderColor: COLORS.green, backgroundColor: 'rgba(0,99,65,0.08)' },
  badgeGold:    { borderColor: COLORS.gold, backgroundColor: 'rgba(255,209,0,0.18)' },
  badgeSpecial: { borderColor: COLORS.red, backgroundColor: 'rgba(206,17,38,0.10)' },
  badgeCode: { fontSize: 10, fontWeight: '900', color: COLORS.ink },
  rowLabel: { fontSize: 14, fontWeight: '800', color: COLORS.ink },
  rowGroup: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  rowPrice: { fontSize: 15, fontWeight: FONT.weight.black, color: COLORS.green, marginRight: SPACING.sm },
  addBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.ink, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingVertical: SPACING.xxxl, gap: SPACING.sm },
  emptyText: { fontSize: 13, color: COLORS.textMuted },
})
