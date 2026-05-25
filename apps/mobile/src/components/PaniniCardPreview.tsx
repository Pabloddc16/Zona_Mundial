/**
 * Visual preview of a Mi Panini card. Renders selfie + frame + stats.
 * Used in the wizard preview step and (smaller) on the order detail page
 * so customers can re-check their card before pickup.
 *
 * Frame styling reuses the rarity color scheme from RARITY_DISPLAY for
 * consistency with the Stars catalog.
 */
import { View, Text, Image, StyleSheet } from 'react-native'
import { RARITY_DISPLAY, type StarRarity } from '@/lib/pricing'
import { COLORS, FONT } from '@/lib/theme'

interface Props {
  cardType: StarRarity
  playerName: string
  country: string
  stats: { pace: number; shooting: number; passing: number; defending: number }
  photoUri: string | null
  width?: number
}

const ASPECT = 1.4   // physical Panini card is ~6.3cm × 8.8cm

export function PaniniCardPreview({
  cardType, playerName, country, stats, photoUri, width = 240,
}: Props) {
  const d = RARITY_DISPLAY[cardType]
  const height = width * ASPECT
  const overall = Math.round((stats.pace + stats.shooting + stats.passing + stats.defending) / 4)

  return (
    <View style={[s.card, { width, height, borderColor: d.color, backgroundColor: d.bg }]}>
      {/* Top stripes — Mexico flag + brand */}
      <View style={s.topStripe}>
        <View style={[s.stripeBox, { backgroundColor: COLORS.green }]} />
        <View style={[s.stripeBox, { backgroundColor: COLORS.gold }]} />
        <View style={[s.stripeBox, { backgroundColor: COLORS.red }]} />
      </View>

      {/* Rarity badge + overall */}
      <View style={s.headerRow}>
        <View style={[s.rarityBadge, { backgroundColor: d.color }]}>
          <Text style={[s.rarityText, { color: d.bg }]}>{cardType}</Text>
        </View>
        <Text style={[s.overall, { color: d.color }]}>{overall}</Text>
      </View>

      {/* Selfie area */}
      <View style={s.photoWrap}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={s.photo} resizeMode="cover" />
        ) : (
          <View style={[s.photoPlaceholder, { borderColor: d.color }]}>
            <Text style={[s.photoPlaceholderText, { color: d.color }]}>TU FOTO</Text>
          </View>
        )}
      </View>

      {/* Name + country */}
      <Text style={[s.name, { color: d.color }]} numberOfLines={1}>
        {playerName || 'TU NOMBRE'}
      </Text>
      <Text style={[s.country, { color: d.color }]}>{country}</Text>

      {/* Stats grid */}
      <View style={s.statsGrid}>
        <Stat color={d.color} label="PAC" value={stats.pace} />
        <Stat color={d.color} label="TIR" value={stats.shooting} />
        <Stat color={d.color} label="PAS" value={stats.passing} />
        <Stat color={d.color} label="DEF" value={stats.defending} />
      </View>

      {/* Footer brand */}
      <Text style={[s.brand, { color: d.color }]}>CROMOS 26</Text>
    </View>
  )
}

function Stat({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <View style={s.stat}>
      <Text style={[s.statValue, { color }]}>{value}</Text>
      <Text style={[s.statLabel, { color }]}>{label}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  card: {
    borderRadius: 14, borderWidth: 4, overflow: 'hidden',
    padding: 10, alignItems: 'center',
  },
  topStripe: {
    flexDirection: 'row', height: 6,
    position: 'absolute', top: 0, left: 0, right: 0,
  },
  stripeBox: { flex: 1 },

  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignSelf: 'stretch', alignItems: 'center',
    paddingTop: 8, marginBottom: 4,
  },
  rarityBadge: {
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 4,
  },
  rarityText: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  overall: { fontSize: 22, fontWeight: '900' },

  photoWrap: {
    width: '88%', aspectRatio: 1,
    borderRadius: 6, overflow: 'hidden',
    marginBottom: 6,
  },
  photo: { width: '100%', height: '100%' },
  photoPlaceholder: {
    flex: 1,
    borderWidth: 2, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },
  photoPlaceholderText: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },

  name: {
    fontSize: 14, fontWeight: FONT.weight.black,
    letterSpacing: 0.5, textAlign: 'center',
    marginTop: 2,
  },
  country: { fontSize: 9, fontWeight: '900', letterSpacing: 2, marginTop: 2 },

  statsGrid: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignSelf: 'stretch', marginTop: 6, paddingHorizontal: 4,
  },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 13, fontWeight: '900' },
  statLabel: { fontSize: 8, fontWeight: '700', letterSpacing: 1 },

  brand: {
    fontSize: 8, fontWeight: '900', letterSpacing: 2,
    marginTop: 4,
  },
})
