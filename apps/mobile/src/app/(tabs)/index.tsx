import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAlbumStore, albumStats } from '@/lib/album-store'
import { ALBUM, TOTAL_STICKERS } from '@/lib/data'

type Tab = 'Todo' | 'Me falta' | 'Tengo extra'
const TABS: Tab[] = ['Todo', 'Me falta', 'Tengo extra']

export default function AlbumScreen() {
  const [tab, setTab] = useState<Tab>('Todo')
  const album = useAlbumStore((s) => s.album)
  const stats = albumStats(album)
  const pct = Math.round((stats.owned / TOTAL_STICKERS) * 100)

  const filteredGroups = ALBUM.filter((g) => {
    if (tab === 'Todo') return true
    if (tab === 'Me falta') return g.stickers.some((s) => !((album[g.id]?.[s.n]?.owned ?? 0) > 0))
    if (tab === 'Tengo extra') return g.stickers.some((s) => (album[g.id]?.[s.n]?.owned ?? 0) > 1)
    return true
  })

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>Mi Álbum</Text>
          <Text style={s.subtitle}>{stats.owned} / {TOTAL_STICKERS} estampas</Text>
          <View style={s.barBg}>
            <View style={[s.barFill, { width: `${pct}%` }]} />
          </View>
          <View style={s.barRow}>
            <Text style={s.barLabel}>{pct}% completado</Text>
            <Text style={s.barLabel}>{stats.needed} buscadas · {stats.extras} extras</Text>
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
  safe: { flex: 1, backgroundColor: '#FEFCE8' },
  scroll: { padding: 16, paddingBottom: 32 },
  header: { marginBottom: 16 },
  title: { fontSize: 26, fontWeight: '800', color: '#1C1917' },
  subtitle: { fontSize: 13, color: '#9CA3AF', marginTop: 2 },
  barBg: { height: 8, backgroundColor: '#E5E7EB', borderRadius: 99, marginTop: 8, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: '#006341', borderRadius: 99 },
  barRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  barLabel: { fontSize: 11, color: '#9CA3AF' },
  tabRow: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 12, padding: 4, marginBottom: 16, gap: 4 },
  tabBtn: { flex: 1, paddingVertical: 6, borderRadius: 8, alignItems: 'center' },
  tabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  tabLabel: { fontSize: 12, fontWeight: '600', color: '#9CA3AF' },
  tabLabelActive: { color: '#1C1917' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { width: '47%', backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 2, borderColor: '#E5E7EB' },
  cardComplete: { borderColor: '#006341', backgroundColor: 'rgba(0,99,65,0.04)' },
  cardEmoji: { fontSize: 28, marginBottom: 6 },
  cardName: { fontSize: 13, fontWeight: '700', color: '#1C1917', lineHeight: 17 },
  cardSub: { fontSize: 11, color: '#9CA3AF', marginTop: 2, marginBottom: 6 },
  cardBarBg: { height: 5, backgroundColor: '#E5E7EB', borderRadius: 99, overflow: 'hidden' },
  cardBarFill: { height: '100%', backgroundColor: '#006341', borderRadius: 99 },
  cardCount: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
})
