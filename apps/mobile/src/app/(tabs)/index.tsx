import { useState, useMemo } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Modal, Pressable, Share } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { Ionicons } from '@expo/vector-icons'
import { useAlbumStore, albumStats } from '@/lib/album-store'
import { ALBUM, TOTAL_STICKERS, type AlbumGroup } from '@/lib/data'
import { COLORS, SPACING, RADIUS, FONT } from '@/lib/theme'

type Tab = 'All' | 'Need' | 'Swaps'
const TABS: Tab[] = ['All', 'Need', 'Swaps']

export default function AlbumScreen() {
  const [tab, setTab] = useState<Tab>('All')
  const [query, setQuery] = useState('')
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [locked, setLocked] = useState(false)

  const album = useAlbumStore((s) => s.album)
  const markOwned = useAlbumStore((s) => s.markOwned)
  const stats = albumStats(album)
  const pct = Math.round((stats.owned / TOTAL_STICKERS) * 100)

  const selectedGroup = selectedGroupId ? ALBUM.find((g) => g.id === selectedGroupId) : null
  const headerLabel = selectedGroup ? selectedGroup.name : 'All sections'

  const visibleGroups = useMemo(() => {
    const groups = selectedGroupId ? ALBUM.filter((g) => g.id === selectedGroupId) : ALBUM
    if (!query.trim() && tab === 'All') return groups

    const q = query.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
    return groups
      .map((g) => {
        const stickers = g.stickers.filter((s) => {
          const state = album[g.id]?.[s.n] ?? { owned: 0, needed: 0 }
          if (tab === 'Need' && state.owned > 0) return false
          if (tab === 'Swaps' && state.owned <= 1) return false
          if (q && !s.code.includes(q)) return false
          return true
        })
        return { ...g, stickers }
      })
      .filter((g) => g.stickers.length > 0)
  }, [selectedGroupId, query, tab, album])

  function toggleCollapsed(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleSticker(groupId: string, n: number) {
    if (locked) return
    const state = album[groupId]?.[n] ?? { owned: 0, needed: 0 }
    markOwned(groupId, n, state.owned > 0 ? -1 : 1)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
  }

  function handleAddDup(groupId: string, n: number) {
    if (locked) return
    markOwned(groupId, n, 1)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {})
  }

  async function handleShare() {
    await Share.share({
      message: `My Cromos 26 album: ${pct}% complete (${stats.owned}/${TOTAL_STICKERS}) 🏆`,
    }).catch(() => {})
  }

  return (
    <SafeAreaView style={s.safe}>
      {/* Editorial eyebrow */}
      <View style={s.eyebrowRow}>
        <View style={s.eyebrowDot} />
        <Text style={s.eyebrowText}>ALBUM · 2026 WORLD CUP</Text>
      </View>

      {/* Top bar — title dropdown + icons */}
      <View style={s.topBar}>
        <TouchableOpacity style={s.dropdown} onPress={() => setPickerOpen(true)} activeOpacity={0.7}>
          <Text style={s.dropdownText} numberOfLines={1}>{headerLabel}</Text>
          <Ionicons name="chevron-down" size={16} color={COLORS.ink} style={{ marginTop: 2 }} />
        </TouchableOpacity>
        <View style={s.iconRow}>
          <TouchableOpacity onPress={() => setLocked((v) => !v)} style={s.iconBtn} hitSlop={8}>
            <Ionicons name={locked ? 'lock-closed' : 'lock-open-outline'} size={20} color={COLORS.ink} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShare} style={s.iconBtn} hitSlop={8}>
            <Ionicons name="share-outline" size={20} color={COLORS.ink} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/tienda')} style={s.storeBtn}>
            <Ionicons name="storefront" size={14} color={COLORS.paper} />
            <Text style={s.storeBtnText}>Store</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Big progress hero */}
      <View style={s.progressHero}>
        <View style={{ flex: 1 }}>
          <Text style={s.progressEyebrow}>YOUR COMPLETION</Text>
          <Text style={s.progressCount}>
            {stats.owned}
            <Text style={s.progressCountTotal}> / {TOTAL_STICKERS}</Text>
          </Text>
        </View>
        <Text style={s.progressPct}>{pct}%</Text>
      </View>
      <View style={s.progressBar}>
        <View style={[s.progressFill, { width: `${pct}%` }]} />
      </View>

      {/* Sub-tabs */}
      <View style={s.tabRow}>
        {TABS.map((t) => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={s.tabBtn}>
            <Text style={[s.tabLabel, tab === t && s.tabLabelActive]}>{t}</Text>
            {tab === t && <View style={s.tabUnderline} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Search */}
      <View style={s.searchRow}>
        <View style={s.search}>
          <Ionicons name="search" size={16} color={COLORS.textMuted} />
          <TextInput
            style={s.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search code (e.g. MEX07)"
            placeholderTextColor={COLORS.textFaint}
            autoCapitalize="characters"
            autoCorrect={false}
          />
        </View>
      </View>

      {/* Stat strip */}
      <View style={s.statStrip}>
        <View style={s.statItem}>
          <Text style={s.statValue}>{stats.needed}</Text>
          <Text style={s.statLabel}>NEEDED</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statItem}>
          <Text style={s.statValue}>{stats.extras}</Text>
          <Text style={s.statLabel}>EXTRAS</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statItem}>
          <Text style={s.statValue}>{ALBUM.length}</Text>
          <Text style={s.statLabel}>SECTIONS</Text>
        </View>
      </View>

      {/* Sections */}
      <ScrollView contentContainerStyle={s.scroll}>
        {visibleGroups.length === 0 && (
          <View style={s.empty}>
            <Ionicons name="search-outline" size={40} color={COLORS.textMuted} style={{ marginBottom: 8 }} />
            <Text style={s.emptyText}>No stickers match this filter</Text>
          </View>
        )}
        {visibleGroups.map((g) => (
          <Section
            key={g.id}
            group={g}
            album={album}
            collapsed={collapsed.has(g.id)}
            onToggle={() => toggleCollapsed(g.id)}
            onSticker={(n) => handleSticker(g.id, n)}
            onDup={(n) => handleAddDup(g.id, n)}
          />
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Group picker modal */}
      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={s.modalBackdrop} onPress={() => setPickerOpen(false)}>
          <Pressable style={s.modalSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={s.modalTitle}>Choose section</Text>
            <ScrollView style={{ maxHeight: 460 }}>
              <TouchableOpacity
                style={[s.pickerItem, !selectedGroupId && s.pickerItemActive]}
                onPress={() => { setSelectedGroupId(null); setPickerOpen(false) }}
              >
                <Ionicons name="grid-outline" size={20} color={COLORS.ink} style={{ marginRight: SPACING.md }} />
                <Text style={s.pickerLabel}>All sections</Text>
              </TouchableOpacity>
              {ALBUM.map((g) => (
                <TouchableOpacity
                  key={g.id}
                  style={[s.pickerItem, selectedGroupId === g.id && s.pickerItemActive]}
                  onPress={() => { setSelectedGroupId(g.id); setPickerOpen(false) }}
                >
                  <Text style={{ fontSize: 22, marginRight: SPACING.md }}>{g.emoji}</Text>
                  <Text style={s.pickerLabel}>{g.name}</Text>
                  <Text style={s.pickerSub}>{g.stickers.length}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  )
}

function Section({
  group,
  album,
  collapsed,
  onToggle,
  onSticker,
  onDup,
}: {
  group: AlbumGroup
  album: Record<string, Record<number, { owned: number; needed: number }>>
  collapsed: boolean
  onToggle: () => void
  onSticker: (n: number) => void
  onDup: (n: number) => void
}) {
  return (
    <View style={s.section}>
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>{group.name} {group.emoji}</Text>
        <TouchableOpacity onPress={onToggle} hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }} style={s.chevronBtn}>
          <Text style={s.sectionToggle}>{collapsed ? '▼' : '▲'}</Text>
        </TouchableOpacity>
      </View>
      {!collapsed && (
        <View style={s.stickerGrid}>
          {group.stickers.map((st) => {
            const state = album[group.id]?.[st.n] ?? { owned: 0, needed: 0 }
            const owned = state.owned > 0
            const dups = state.owned > 1 ? state.owned - 1 : 0
            return (
              <TouchableOpacity
                key={st.n}
                onPress={() => onSticker(st.n)}
                onLongPress={() => onDup(st.n)}
                style={[s.sticker, owned ? s.stickerOwned : s.stickerEmpty]}
                activeOpacity={0.7}
              >
                <Text style={[s.stickerNum, owned ? s.stickerNumOwned : s.stickerNumEmpty]}>{st.n}</Text>
                {dups > 0 && (
                  <View style={s.dupBadge}>
                    <Text style={s.dupBadgeText}>{dups}</Text>
                  </View>
                )}
              </TouchableOpacity>
            )
          })}
        </View>
      )}
    </View>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.cream },

  /* eyebrow */
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: 4 },
  eyebrowDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.red },
  eyebrowText: { fontSize: 10, fontWeight: FONT.weight.bold, letterSpacing: 2, color: COLORS.green, fontFamily: FONT.family.mono },

  topBar: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingTop: 2, paddingBottom: SPACING.md, gap: SPACING.md },
  dropdown: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  dropdownText: { fontSize: FONT.size.displayXL, fontWeight: FONT.weight.black, color: COLORS.ink, flexShrink: 1, fontFamily: FONT.family.display, letterSpacing: -0.5 },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  storeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.ink, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  storeBtnText: { color: COLORS.paper, fontWeight: '700', fontSize: 12 },

  /* progress hero */
  progressHero: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: SPACING.xs, marginHorizontal: SPACING.lg, marginBottom: SPACING.sm, backgroundColor: COLORS.paper, borderRadius: RADIUS.lg, padding: SPACING.lg, borderWidth: 2, borderColor: COLORS.ink },
  progressEyebrow: { fontSize: 9, fontWeight: FONT.weight.bold, letterSpacing: 2.5, color: COLORS.textMuted, fontFamily: FONT.family.mono, marginBottom: 4 },
  progressCount: { fontSize: 36, fontWeight: FONT.weight.black, color: COLORS.ink, fontFamily: FONT.family.display, letterSpacing: -1 },
  progressCountTotal: { fontSize: 18, fontWeight: FONT.weight.medium, color: COLORS.textFaint },
  progressPct: { fontSize: 44, fontWeight: FONT.weight.black, color: COLORS.green, fontFamily: FONT.family.display, letterSpacing: -1, lineHeight: 50 },

  progressBar: { height: 6, backgroundColor: COLORS.surface3, marginHorizontal: SPACING.lg, borderRadius: 99, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.green, borderRadius: 99 },

  /* stat strip */
  statStrip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, gap: SPACING.md },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: FONT.weight.black, color: COLORS.ink, fontFamily: FONT.family.display },
  statLabel: { fontSize: 9, fontWeight: FONT.weight.bold, letterSpacing: 1.5, color: COLORS.textMuted, fontFamily: FONT.family.mono, marginTop: 2 },
  statDivider: { width: 1, height: 28, backgroundColor: COLORS.border },

  /* tabs */
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingHorizontal: SPACING.lg, backgroundColor: COLORS.cream },
  tabBtn: { flex: 1, paddingVertical: SPACING.md, alignItems: 'center', position: 'relative' },
  tabLabel: { fontSize: FONT.size.bodyL, fontWeight: FONT.weight.medium, color: COLORS.textMuted, fontFamily: FONT.family.display },
  tabLabelActive: { color: COLORS.ink, fontWeight: FONT.weight.black },
  tabUnderline: { position: 'absolute', bottom: -1, left: '15%', right: '15%', height: 3, backgroundColor: COLORS.green, borderRadius: 1 },

  searchRow: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.paper, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: COLORS.border },
  searchInput: { flex: 1, fontSize: FONT.size.bodyL, color: COLORS.ink, padding: 0 },

  scroll: { paddingTop: SPACING.md, paddingBottom: SPACING.xxl },

  empty: { alignItems: 'center', paddingVertical: SPACING.xxxl },
  emptyText: { fontSize: FONT.size.bodyM, color: COLORS.textMuted },

  section: { marginBottom: SPACING.xl },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm },
  sectionTitle: { fontSize: 22, fontWeight: FONT.weight.black, color: COLORS.ink, fontFamily: FONT.family.display, letterSpacing: -0.5 },
  sectionToggle: { fontSize: 14, color: COLORS.textMuted },
  chevronBtn: { padding: 6 },
  stickerGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: SPACING.lg, gap: 12, marginTop: SPACING.sm },

  sticker: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  stickerEmpty: { backgroundColor: '#FEF3C7' },
  stickerOwned: { backgroundColor: '#94A3B8' },
  stickerNum: { fontSize: 18, fontWeight: FONT.weight.bold },
  stickerNumEmpty: { color: '#B45309' },
  stickerNumOwned: { color: COLORS.paper, textDecorationLine: 'line-through' },
  dupBadge: { position: 'absolute', top: -4, right: -4, minWidth: 22, height: 22, borderRadius: 11, backgroundColor: '#3B82F6', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  dupBadgeText: { color: COLORS.paper, fontWeight: FONT.weight.black, fontSize: 11 },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: COLORS.paper, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.xl, paddingBottom: SPACING.xxxl },
  modalTitle: { fontSize: FONT.size.displayL, fontWeight: FONT.weight.black, color: COLORS.ink, marginBottom: SPACING.lg },
  pickerItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.md, paddingHorizontal: SPACING.md, borderRadius: 12 },
  pickerItemActive: { backgroundColor: '#F3F4F6' },
  pickerLabel: { fontSize: FONT.size.bodyL, color: COLORS.ink, flex: 1, fontWeight: FONT.weight.medium },
  pickerSub: { fontSize: FONT.size.bodyS, color: COLORS.textMuted },
})
