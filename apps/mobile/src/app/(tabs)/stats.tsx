import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAlbumStore, albumStats } from '@/lib/album-store'
import { ALBUM, TOTAL_STICKERS } from '@/lib/data'
import { COLORS, SPACING, RADIUS, FONT, SHADOW } from '@/lib/theme'

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
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={s.title}>Stats</Text>
          <TouchableOpacity onPress={() => router.push('/settings')} hitSlop={8} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="settings-outline" size={20} color={COLORS.ink} style={{ opacity: 0.6 }} />
          </TouchableOpacity>
        </View>

        {/* Big card */}
        <View style={s.heroCard}>
          <Text style={s.heroPct}>{pct}%</Text>
          <Text style={s.heroSub}>complete</Text>
          <View style={s.heroStats}>
            <StatItem label="Have" value={stats.owned} />
            <StatItem label="Missing" value={TOTAL_STICKERS - stats.owned} />
            <StatItem label="Need" value={stats.needed} />
            <StatItem label="Extras" value={stats.extras} />
          </View>
        </View>

        {/* Progress */}
        <View style={s.progressCard}>
          <View style={s.progressRow}>
            <Text style={s.progressLabel}>{stats.owned} / {TOTAL_STICKERS}</Text>
            <Text style={s.progressLabel}>{TOTAL_STICKERS - stats.owned} remaining</Text>
          </View>
          <View style={s.barBg}>
            <View style={[s.barFill, { width: `${pct}%` }]} />
          </View>
        </View>

        {/* Group breakdown */}
        {completed.length > 0 && <Section title={`Complete (${completed.length})`} groups={completed} />}
        {inProgress.length > 0 && <Section title={`In progress (${inProgress.length})`} groups={inProgress} />}
      </ScrollView>
    </SafeAreaView>
  )
}

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: 24, fontWeight: FONT.weight.black, color: COLORS.paper }}>{value}</Text>
      <Text style={{ fontSize: FONT.size.bodyS, color: 'rgba(255,255,255,0.7)', marginTop: 2, fontWeight: FONT.weight.medium, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
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
  safe: { flex: 1, backgroundColor: COLORS.cream },
  scroll: { padding: SPACING.lg, paddingBottom: SPACING.xxxl },
  title: { fontSize: FONT.size.displayXL, fontWeight: FONT.weight.black, color: COLORS.ink, marginBottom: SPACING.lg },
  heroCard: { backgroundColor: COLORS.ink, borderRadius: RADIUS.xxl, padding: SPACING.xl, alignItems: 'center', marginBottom: SPACING.md, ...SHADOW.md },
  heroPct: { fontSize: 72, fontWeight: FONT.weight.black, color: COLORS.gold },
  heroSub: { fontSize: FONT.size.bodyL, color: 'rgba(255,255,255,0.7)', marginTop: 2, fontWeight: FONT.weight.medium },
  heroStats: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: SPACING.xl, paddingTop: SPACING.lg, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' },
  progressCard: { backgroundColor: COLORS.paper, borderRadius: RADIUS.xl, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.lg, ...SHADOW.sm },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.sm },
  progressLabel: { fontSize: FONT.size.bodyM, color: COLORS.textMuted, fontWeight: FONT.weight.medium },
  barBg: { height: 10, backgroundColor: COLORS.surface2, borderRadius: RADIUS.full, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: COLORS.green, borderRadius: RADIUS.full },
  section: { marginBottom: SPACING.lg },
  sectionTitle: { fontSize: FONT.size.label, fontWeight: FONT.weight.bold, color: COLORS.textMuted, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: SPACING.sm },
  sectionCard: { backgroundColor: COLORS.paper, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', ...SHADOW.sm },
  groupRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  groupRowBorder: { borderTopWidth: 1, borderTopColor: COLORS.borderSoft },
  groupName: { fontSize: FONT.size.bodyM, fontWeight: FONT.weight.bold, color: COLORS.ink, marginBottom: SPACING.xs },
  groupCount: { fontSize: FONT.size.bodyS, fontWeight: FONT.weight.bold, color: COLORS.textMuted, minWidth: 40, textAlign: 'right' },
})
