import { useState, useMemo } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Modal, Pressable, Share } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { Ionicons } from '@expo/vector-icons'
import * as Clipboard from 'expo-clipboard'
import { useAlbumStore, albumStats } from '@/lib/album-store'
import { ALBUM, TOTAL_STICKERS, type AlbumGroup } from '@/lib/data'
import { COLORS, SPACING, RADIUS, FONT } from '@/lib/theme'
import { generateRepetidasShareText } from '@/lib/share'

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

  // Tap = always +1 (cycles 0 → 1 → 2 → 3 → N, unlimited)
  function handleSticker(groupId: string, n: number) {
    if (locked) return
    markOwned(groupId, n, 1)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
  }

  // Long press = -1 (decrement, floor 0). If already 0, heavy haptic to
  // signal "nothing to remove" without changing state.
  function handleAddDup(groupId: string, n: number) {
    if (locked) return
    const state = album[groupId]?.[n] ?? { owned: 0, needed: 0 }
    if (state.owned <= 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {})
      return
    }
    markOwned(groupId, n, -1)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {})
  }

  // "Compartir repetidas" — generates the exact format Pablo specified and
  // uses the native share sheet, falling back to clipboard if unavailable.
  async function handleShare() {
    const message = generateRepetidasShareText(album)
    try {
      const result = await Share.share({ message })
      if (result.action === Share.dismissedAction) {
        await Clipboard.setStringAsync(message)
      }
    } catch {
      await Clipboard.setStringAsync(message).catch(() => {})
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      {/* Top bar — title dropdown + icons */}
      <View style={s.topBar}>
        <TouchableOpacity style={s.dropdown} onPress={() => setPickerOpen(true)} activeOpacity={0.7}>
          <Text style={s.dropdownText} numberOfLines={1}>{headerLabel}</Text>
          <Text style={s.dropdownIcon}>▼</Text>
        </TouchableOpacity>
        <View style={s.iconRow}>
          <TouchableOpacity onPress={() => setLocked((v) => !v)} style={s.iconBtn} hitSlop={8}>
            <Ionicons name={locked ? 'lock-closed' : 'lock-open-outline'} size={20} color={COLORS.ink} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShare} style={s.iconBtn} hitSlop={8}>
            <Ionicons name="share-social-outline" size={20} color={COLORS.ink} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/tienda')} style={s.storeBtn}>
            <Ionicons name="storefront" size={14} color={COLORS.paper} />
            <Text style={s.storeBtnText}>Store</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/settings')} style={s.iconBtn} hitSlop={8}>
            <Ionicons name="settings-outline" size={20} color={COLORS.ink} style={{ opacity: 0.6 }} />
          </TouchableOpacity>
        </View>
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

      {/* Progress mini bar */}
      <View style={s.progressBar}>
        <View style={[s.progressFill, { width: `${pct}%` }]} />
      </View>
      <Text style={s.progressLabel}>{pct}% · {stats.owned}/{TOTAL_STICKERS} · {stats.needed} needed · {stats.extras} extras</Text>

      {/* Sections */}
      <ScrollView contentContainerStyle={s.scroll}>
        {/* Refiere y gana — Pablo's signature acquisition card */}
        <TouchableOpacity
          onPress={() => router.push('/referral')}
          activeOpacity={0.85}
          style={s.referralCard}
        >
          <View style={s.referralIconWrap}>
            <Ionicons name="gift" size={26} color={COLORS.gold} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.referralTitle}>Invita a un amigo, gana $50</Text>
            <Text style={s.referralSub}>Por cada amigo que complete su primera compra, ganas $50 de crédito.</Text>
          </View>
          <View style={s.referralCta}>
            <Text style={s.referralCtaText}>Mi código</Text>
            <Ionicons name="arrow-forward" size={14} color={COLORS.ink} />
          </View>
        </TouchableOpacity>

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
            const rarity = st.rarity ?? 'common'
            const wrap = [
              s.sticker,
              owned ? s.stickerOwned : s.stickerEmpty,
              rarity === 'bronze' && (owned ? s.stickerBronzeOwned : s.stickerBronze),
              rarity === 'silver' && (owned ? s.stickerSilverOwned : s.stickerSilver),
              rarity === 'gold' && (owned ? s.stickerGoldOwned : s.stickerGold),
              rarity === 'foil' && (owned ? s.stickerFoilOwned : s.stickerFoil),
              rarity === 'special' && (owned ? s.stickerSpecialOwned : s.stickerSpecial),
            ]
            const numStyle = [
              s.stickerNum,
              owned ? s.stickerNumOwned : s.stickerNumEmpty,
              rarity === 'bronze' && (owned ? s.numBronzeOwned : s.numBronze),
              rarity === 'silver' && (owned ? s.numSilverOwned : s.numSilver),
              rarity === 'gold' && (owned ? s.numGoldOwned : s.numGold),
              rarity === 'foil' && (owned ? s.numFoilOwned : s.numFoil),
              rarity === 'special' && (owned ? s.numSpecialOwned : s.numSpecial),
            ]
            return (
              <TouchableOpacity
                key={st.n}
                onPress={() => onSticker(st.n)}
                onLongPress={() => onDup(st.n)}
                style={wrap}
                activeOpacity={0.7}
              >
                <Text style={numStyle}>{st.n}</Text>
                {rarity === 'gold' && <Text style={s.cornerBadge}>★</Text>}
                {rarity === 'foil' && <Text style={s.cornerBadge}>✦</Text>}
                {rarity === 'special' && <Text style={s.cornerBadgeRare}>R</Text>}
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
  safe: { flex: 1, backgroundColor: COLORS.paper },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, gap: SPACING.md },
  dropdown: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  dropdownText: { fontSize: FONT.size.displayM, fontWeight: FONT.weight.bold, color: COLORS.ink, flexShrink: 1 },
  dropdownIcon: { fontSize: 11, color: COLORS.ink },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  storeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.ink, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  storeBtnText: { color: COLORS.paper, fontWeight: '700', fontSize: 12 },

  tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.borderSoft, paddingHorizontal: SPACING.lg },
  tabBtn: { flex: 1, paddingVertical: SPACING.md, alignItems: 'center', position: 'relative' },
  tabLabel: { fontSize: FONT.size.bodyL, fontWeight: FONT.weight.medium, color: COLORS.textMuted },
  tabLabelActive: { color: COLORS.ink, fontWeight: FONT.weight.bold },
  tabUnderline: { position: 'absolute', bottom: 0, left: '15%', right: '15%', height: 2, backgroundColor: '#3B82F6', borderRadius: 1 },

  searchRow: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F3F4F6', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: FONT.size.bodyL, color: COLORS.ink, padding: 0 },

  progressBar: { height: 4, backgroundColor: '#E5E7EB', marginHorizontal: SPACING.lg, marginTop: SPACING.md, borderRadius: 99, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.green, borderRadius: 99 },
  progressLabel: { fontSize: FONT.size.bodyS, color: COLORS.textMuted, paddingHorizontal: SPACING.lg, paddingTop: 4 },

  scroll: { paddingTop: SPACING.lg },

  /* Refiere y gana hero card */
  referralCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.green,
    borderWidth: 1.5,
    borderColor: COLORS.gold,
  },
  referralIconWrap: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(255,209,0,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  referralTitle: { fontSize: 15, fontWeight: '900', color: COLORS.paper, marginBottom: 2 },
  referralSub: { fontSize: 11, color: 'rgba(255,255,255,0.85)', lineHeight: 15 },
  referralCta: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.gold,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 99,
  },
  referralCtaText: { fontSize: 11, fontWeight: '900', color: COLORS.ink },


  empty: { alignItems: 'center', paddingVertical: SPACING.xxxl },
  emptyText: { fontSize: FONT.size.bodyM, color: COLORS.textMuted },

  section: { marginBottom: SPACING.xl },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm },
  sectionTitle: { fontSize: FONT.size.displayM, fontWeight: FONT.weight.bold, color: COLORS.ink },
  sectionToggle: { fontSize: 14, color: COLORS.textMuted },
  chevronBtn: { padding: 6 },
  stickerGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: SPACING.lg, gap: 12, marginTop: SPACING.sm },

  sticker: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  stickerEmpty: { backgroundColor: '#FEF3C7' },
  stickerOwned: { backgroundColor: '#94A3B8' },
  stickerNum: { fontSize: 18, fontWeight: FONT.weight.bold },
  stickerNumEmpty: { color: '#B45309' },
  stickerNumOwned: { color: COLORS.paper, textDecorationLine: 'line-through' },

  /* Rarity variants — empty + owned states */
  stickerBronze:        { backgroundColor: '#F5E3D2', borderWidth: 2, borderColor: '#B87333' },
  stickerBronzeOwned:   { backgroundColor: '#6B4423', borderWidth: 2, borderColor: '#B87333' },
  numBronze:            { color: '#7A4A1F' },
  numBronzeOwned:       { color: '#F5E3D2', textDecorationLine: 'line-through' },

  stickerSilver:        { backgroundColor: '#EEF2F6', borderWidth: 2, borderColor: '#9CA3AF' },
  stickerSilverOwned:   { backgroundColor: '#4B5563', borderWidth: 2, borderColor: '#D1D5DB' },
  numSilver:            { color: '#4B5563' },
  numSilverOwned:       { color: '#F3F4F6', textDecorationLine: 'line-through' },

  stickerGold:          { backgroundColor: '#FFF8DC', borderWidth: 2, borderColor: COLORS.gold },
  stickerGoldOwned:     { backgroundColor: COLORS.ink, borderWidth: 2, borderColor: COLORS.gold },
  numGold:              { color: COLORS.goldDark, fontWeight: '900' },
  numGoldOwned:         { color: COLORS.gold, textDecorationLine: 'line-through' },

  stickerFoil:          { backgroundColor: '#FAF6EE', borderWidth: 2, borderColor: COLORS.green },
  stickerFoilOwned:     { backgroundColor: COLORS.green, borderWidth: 2, borderColor: COLORS.gold },
  numFoil:              { color: COLORS.green, fontWeight: '900' },
  numFoilOwned:         { color: COLORS.gold, textDecorationLine: 'line-through' },

  stickerSpecial:       { backgroundColor: '#FFE4E6', borderWidth: 2, borderColor: COLORS.red },
  stickerSpecialOwned:  { backgroundColor: COLORS.red, borderWidth: 2, borderColor: COLORS.gold },
  numSpecial:           { color: COLORS.red, fontWeight: '900' },
  numSpecialOwned:      { color: COLORS.gold, textDecorationLine: 'line-through' },

  cornerBadge:          { position: 'absolute', top: -4, left: -4, width: 18, height: 18, borderRadius: 9, backgroundColor: COLORS.gold, color: COLORS.ink, fontSize: 10, fontWeight: '900', textAlign: 'center', lineHeight: 18, overflow: 'hidden' },
  cornerBadgeRare:      { position: 'absolute', top: -4, left: -4, width: 18, height: 18, borderRadius: 9, backgroundColor: COLORS.red, color: COLORS.paper, fontSize: 9, fontWeight: '900', textAlign: 'center', lineHeight: 18, overflow: 'hidden' },

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
