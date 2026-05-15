import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAlbumStore, albumStats } from '@/lib/album-store'
import { ALBUM, TOTAL_STICKERS } from '@/lib/data'
import { COLORS, SPACING, RADIUS, FONT, SHADOW } from '@/lib/theme'

type Tab = 'All' | 'Missing' | 'Duplicates'
const TABS: Tab[] = ['All', 'Missing', 'Duplicates']

export default function AlbumScreen() {
  const [tab, setTab] = useState<Tab>('All')
  const album = useAlbumStore((s) => s.album)
  const stats = albumStats(album)
  const pct = Math.round((stats.owned / TOTAL_STICKERS) * 100)

  const filteredGroups = ALBUM.filter((g) => {
    if (tab === 'All') return true
    if (tab === 'Missing') return g.stickers.some((s) => !((album[g.id]?.[s.n]?.owned ?? 0) > 0))
    if (tab === 'Duplicates') return g.stickers.some((s) => (album[g.id]?.[s.n]?.owned ?? 0) > 1)
    return true
  })

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll}>
        {/* Header */}
        <View style={s.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={s.title}>My Album</Text>
            <TouchableOpacity
              onPress={() => router.push('/tienda')}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md, backgroundColor: COLORS.ink, borderRadius: 999 }}
            >
              <Text style={{ fontSize: 16 }}>🛒</Text>
              <Text style={{ color: COLORS.paper, fontWeight: '700', fontSize: 13 }}>Store</Text>
            </TouchableOpacity>
          </View>
          <Text style={s.subtitle}>{stats.owned} / {TOTAL_STICKERS} stickers</Text>
          <View style={s.barBg}>
            <View style={[s.barFill, { width: `${pct}%` }]} />
          </View>
          <View style={s.barRow}>
            <Text style={s.barLabel}>{pct}% complete</Text>
            <Text style={s.barLabel}>{stats.needed} needed · {stats.extras} extras</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={s.tabRow}>
          {TABS.map((t) => (
            <TouchableOpacity key={t} onPress={() => setTab(t)} style={[s.tabBtn, tab === t && s.tabActive]}>
              <Text style={[s.tabLabel, tab === t && s.tabLabelActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Group grid */}
        <View style={s.grid}>
          {filteredGroups.map((g) => {
            const gs = album[g.id] ?? {}
            const owned = g.stickers.filter((st) => (gs[st.n]?.owned ?? 0) > 0).length
            const total = g.stickers.length
            const gPct = Math.round((owned / total) * 100)
            const complete = owned === total
            return (
              <TouchableOpacity
                key={g.id}
                style={[s.card, complete && s.cardComplete]}
                onPress={() => router.push(`/album/${g.id}`)}
                activeOpacity={0.7}
              >
                <Text style={s.cardEmoji}>{g.emoji}</Text>
                <Text style={s.cardName} numberOfLines={2}>{g.name}</Text>
                <Text style={s.cardSub}>{g.subtitle}</Text>
                <View style={s.cardBarBg}>
                  <View style={[s.cardBarFill, { width: `${gPct}%` }]} />
                </View>
                <Text style={s.cardCount}>{owned}/{total}</Text>
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
  scroll: { padding: SPACING.lg, paddingBottom: SPACING.xxxl },
  header: { marginBottom: SPACING.lg },
  title: { fontSize: FONT.size.displayXL, fontWeight: FONT.weight.black, color: COLORS.ink },
  subtitle: { fontSize: FONT.size.bodyM, color: COLORS.textMuted, marginTop: 2 },
  barBg: { height: 10, backgroundColor: COLORS.surface2, borderRadius: RADIUS.full, marginTop: SPACING.sm, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: COLORS.green, borderRadius: RADIUS.full },
  barRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.xs },
  barLabel: { fontSize: FONT.size.bodyS, color: COLORS.textMuted, fontWeight: FONT.weight.medium },
  tabRow: { flexDirection: 'row', backgroundColor: COLORS.surface2, borderRadius: RADIUS.md, padding: 4, marginBottom: SPACING.lg, gap: 4 },
  tabBtn: { flex: 1, paddingVertical: SPACING.sm, borderRadius: RADIUS.sm, alignItems: 'center' },
  tabActive: { backgroundColor: COLORS.paper, ...SHADOW.sm },
  tabLabel: { fontSize: FONT.size.bodyM, fontWeight: FONT.weight.bold, color: COLORS.textMuted },
  tabLabelActive: { color: COLORS.ink },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md },
  card: { width: '47%', backgroundColor: COLORS.paper, borderRadius: RADIUS.xl, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border, ...SHADOW.sm },
  cardComplete: { borderColor: COLORS.green, backgroundColor: 'rgba(0,99,65,0.04)' },
  cardEmoji: { fontSize: 32, marginBottom: SPACING.sm },
  cardName: { fontSize: FONT.size.bodyM, fontWeight: FONT.weight.bold, color: COLORS.ink, lineHeight: 17 },
  cardSub: { fontSize: FONT.size.bodyS, color: COLORS.textMuted, marginTop: 2, marginBottom: SPACING.sm },
  cardBarBg: { height: 5, backgroundColor: COLORS.surface2, borderRadius: RADIUS.full, overflow: 'hidden' },
  cardBarFill: { height: '100%', backgroundColor: COLORS.green, borderRadius: RADIUS.full },
  cardCount: { fontSize: FONT.size.bodyS, color: COLORS.textMuted, marginTop: SPACING.xs, fontWeight: FONT.weight.medium },
})
