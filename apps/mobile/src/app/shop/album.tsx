/**
 * /shop/album — "Llena tu álbum" 4-tab helper.
 * Tabs: Faltantes · Recomendadas · Intercambio · Packs sugeridos
 */
import { useMemo, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAlbumStore } from '@/lib/album-store'
import { useProductsStore } from '@/lib/products-store'
import { ALBUM, fmt } from '@/lib/data'
import { COLORS, SPACING, RADIUS, FONT } from '@/lib/theme'

type Tab = 'faltantes' | 'recomendadas' | 'intercambio' | 'packs'
const TABS: { id: Tab; label: string }[] = [
  { id: 'faltantes',    label: 'Faltantes' },
  { id: 'recomendadas', label: 'Recomendadas' },
  { id: 'intercambio',  label: 'Intercambio' },
  { id: 'packs',        label: 'Packs' },
]

export default function AlbumFillScreen() {
  const [tab, setTab] = useState<Tab>('faltantes')
  const album = useAlbumStore((s) => s.album)
  const products = useProductsStore((s) => s.products)

  // Missing list (sorted by rarity: gold > foil > special > common)
  const missing = useMemo(() => {
    const RARITY_ORDER: Record<string, number> = { gold: 0, foil: 1, special: 2, silver: 3, bronze: 4, common: 5 }
    const out: { groupId: string; groupName: string; emoji: string; code: string; label: string; price: number; rarity: string }[] = []
    for (const g of ALBUM) {
      const gs = album[g.id] ?? {}
      for (const st of g.stickers) {
        if ((gs[st.n]?.owned ?? 0) > 0) continue
        out.push({
          groupId: g.id,
          groupName: g.name,
          emoji: g.emoji,
          code: st.code,
          label: st.label,
          price: st.price,
          rarity: st.rarity ?? 'common',
        })
      }
    }
    return out.sort((a, b) => (RARITY_ORDER[a.rarity]! - RARITY_ORDER[b.rarity]!))
  }, [album])

  // Recomendadas — sections you're 70%+ done with
  const almostDone = useMemo(() => {
    return ALBUM
      .map((g) => {
        const gs = album[g.id] ?? {}
        const owned = g.stickers.filter((st) => (gs[st.n]?.owned ?? 0) > 0).length
        return { ...g, owned, total: g.stickers.length, pct: owned / g.stickers.length }
      })
      .filter((g) => g.pct >= 0.7 && g.pct < 1)
      .sort((a, b) => b.pct - a.pct)
  }, [album])

  const packs = products.filter((p) => p.category === 'sobres' || p.category === 'packs')

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
        </TouchableOpacity>
        <Text style={s.title}>Llena tu álbum</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={s.tabRow}>
        {TABS.map((t) => (
          <TouchableOpacity key={t.id} onPress={() => setTab(t.id)} style={s.tabBtn}>
            <Text style={[s.tabLabel, tab === t.id && s.tabLabelActive]}>{t.label}</Text>
            {tab === t.id && <View style={s.tabUnderline} />}
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {tab === 'faltantes' && (
          missing.length === 0
            ? <Empty icon="checkmark-circle-outline" text="¡Álbum completo!" />
            : missing.slice(0, 100).map((m) => (
                <View key={m.code} style={s.row}>
                  <View style={s.rowBadge}><Text style={s.rowBadgeText}>{m.code}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.rowLabel}>{m.label}</Text>
                    <Text style={s.rowSub}>{m.emoji} {m.groupName}</Text>
                  </View>
                  <Text style={s.rowPrice}>{fmt(m.price)}</Text>
                </View>
              ))
        )}

        {tab === 'recomendadas' && (
          almostDone.length === 0
            ? <Empty icon="trending-up-outline" text="Sigue marcando — apareceran secciones casi completas." />
            : almostDone.map((g) => (
                <View key={g.id} style={s.row}>
                  <Text style={{ fontSize: 28, marginRight: SPACING.md }}>{g.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.rowLabel}>{g.name}</Text>
                    <Text style={s.rowSub}>{g.owned}/{g.total} stickers</Text>
                  </View>
                  <Text style={s.rowPrice}>{Math.round(g.pct * 100)}%</Text>
                </View>
              ))
        )}

        {tab === 'intercambio' && <Empty icon="sync-outline" text="Próximamente — top stickers que aparecen en intercambios." />}

        {tab === 'packs' && (
          packs.map((p) => (
            <TouchableOpacity key={p.id} onPress={() => router.push(`/producto/${p.id}`)} style={s.row}>
              <Text style={{ fontSize: 28, marginRight: SPACING.md }}>{p.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.rowLabel}>{p.name}</Text>
                <Text style={s.rowSub} numberOfLines={1}>{p.description}</Text>
              </View>
              <Text style={s.rowPrice}>{fmt(p.price)}</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function Empty({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={s.empty}>
      <Ionicons name={icon} size={32} color={COLORS.textMuted} />
      <Text style={s.emptyText}>{text}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.cream },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '900', color: COLORS.ink },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingHorizontal: SPACING.lg },
  tabBtn: { flex: 1, paddingVertical: SPACING.md, alignItems: 'center', position: 'relative' },
  tabLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  tabLabelActive: { color: COLORS.ink, fontWeight: '900' },
  tabUnderline: { position: 'absolute', bottom: 0, left: '20%', right: '20%', height: 2, backgroundColor: COLORS.green, borderRadius: 1 },
  scroll: { padding: SPACING.lg, gap: SPACING.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: COLORS.paper, padding: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.sm },
  rowBadge: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.surface2, alignItems: 'center', justifyContent: 'center' },
  rowBadgeText: { fontSize: 10, fontWeight: '900', color: COLORS.ink },
  rowLabel: { fontSize: 14, fontWeight: '800', color: COLORS.ink },
  rowSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  rowPrice: { fontSize: 14, fontWeight: '900', color: COLORS.green },
  empty: { alignItems: 'center', paddingVertical: SPACING.xxxl, gap: SPACING.sm },
  emptyText: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', paddingHorizontal: SPACING.xl },
})
