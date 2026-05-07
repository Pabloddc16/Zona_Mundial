import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAlbumStore, albumStats } from '@/lib/album-store'
import { ALBUM, TOTAL_STICKERS } from '@/lib/data'

export default function StatsScreen() {
  const album = useAlbumStore((s) => s.album)
  const timeline = useAlbumStore((s) => s.timeline)
  const stats = albumStats(album)
  const pct = Math.round((stats.owned / TOTAL_STICKERS) * 100)

  const groupStats = ALBUM.map((g) => {
    const gs = album[g.id] ?? {}
    const owned = g.stickers.filter((st) => (gs[st.n]?.owned ?? 0) > 0).length
    return { ...g, owned, total: g.stickers.length, pct: Math.round((owned / g.stickers.length) * 100) }
  }).sort((a, b) => b.pct - a.pct)

  const completed = groupStats.filter((g) => g.pct === 100)
  const inProgress = groupStats.filter((g) => g.pct > 0 && g.pct < 100)

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.title}>Estadísticas</Text>

        {/* Big card */}
        <View style={s.heroCard}>
          <Text style={s.heroPct}>{pct}%</Text>
          <Text style={s.heroSub}>completado</Text>
          <View style={s.heroStats}>
            <StatItem label="Tengo" value={stats.owned} />
            <StatItem label="Me falta" value={TOTAL_STICKERS - stats.owned} />
            <StatItem label="Busco" value={stats.needed} />
            <StatItem label="Extra" value={stats.extras} />
          </View>
        </View>

        {/* Progress */}
        <View style={s.progressCard}>
          <View style={s.progressRow}>
            <Text style={s.progressLabel}>{stats.owned} / {TOTAL_STICKERS}</Text>
            <Text style={s.progressLabel}>{TOTAL_STICKERS - stats.owned} restantes</Text>
          </View>
          <View style={s.barBg}>
            <View style={[s.barFill, { width: `${pct}%` }]} />
          </View>
        </View>

        {/* Group breakdown */}
        {completed.length > 0 && <Section title={`Completadas (${completed.length})`} groups={completed} />}
        {inProgress.length > 0 && <Section title={`En progreso (${inProgress.length})`} groups={inProgress} />}
      </ScrollView>
    </SafeAreaView>
  )
}

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: 22, fontWeight: '900', color: '#fff' }}>{value}</Text>
      <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>{label}</Text>
    </View>
  )
}

function Section({ title, groups }: { title: string; groups: { id: string; emoji: string; name: string; owned: number; total: number; pct: number }[] }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.sectionCard}>
        {groups.map((g, i) => (
          <View key={g.id} style={[s.groupRow, i > 0 && s.groupRowBorder]}>
            <Text style={{ fontSize: 20 }}>{g.emoji}</Text>
            <View style={{ flex: 1, marginHorizontal: 10 }}>
              <Text style={s.groupName} numberOfLines={1}>{g.name}</Text>
              <View style={s.barBg}>
                <View style={[s.barFill, { width: `${g.pct}%` }]} />
              </View>
            </View>
            <Text style={s.groupCount}>{g.owned}/{g.total}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FEFCE8' },
  scroll: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 26, fontWeight: '800', color: '#1C1917', marginBottom: 16 },
  heroCard: { backgroundColor: '#006341', borderRadius: 24, padding: 24, alignItems: 'center', marginBottom: 12 },
  heroPct: { fontSize: 64, fontWeight: '900', color: '#fff' },
  heroSub: { fontSize: 15, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  heroStats: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' },
  progressCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#F3F4F6', marginBottom: 16 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel: { fontSize: 13, color: '#6B7280' },
  barBg: { height: 8, backgroundColor: '#E5E7EB', borderRadius: 99, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: '#006341', borderRadius: 99 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  sectionCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#F3F4F6', overflow: 'hidden' },
  groupRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  groupRowBorder: { borderTopWidth: 1, borderTopColor: '#F9FAFB' },
  groupName: { fontSize: 13, fontWeight: '600', color: '#1C1917', marginBottom: 4 },
  groupCount: { fontSize: 12, fontWeight: '700', color: '#9CA3AF', minWidth: 36, textAlign: 'right' },
})
