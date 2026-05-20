import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, SPACING, RADIUS, FONT } from '@/lib/theme'

export default function MyPaniniScreen() {
  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
        </TouchableOpacity>
        <Text style={s.title}>Mi Panini</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={s.body}>
        <View style={s.iconWrap}>
          <Ionicons name="camera" size={40} color={COLORS.green} />
        </View>
        <Text style={s.heroTitle}>Crea tu sticker personalizada</Text>
        <Text style={s.heroSub}>Toma una selfie y la convertimos en un sticker estilo Panini oficial. $200 MXN.</Text>
        <View style={s.comingSoonBadge}>
          <Ionicons name="time-outline" size={14} color={COLORS.gold} />
          <Text style={s.comingSoonText}>Próximamente</Text>
        </View>
        <Text style={s.note}>Estamos terminando el editor de fotos. Si te interesa, deja tu email cuando lance.</Text>
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.cream },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '900', color: COLORS.ink },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.xl, gap: SPACING.md },
  iconWrap: { width: 88, height: 88, borderRadius: 44, backgroundColor: 'rgba(0,99,65,0.10)', alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.md },
  heroTitle: { fontSize: 22, fontWeight: FONT.weight.black, color: COLORS.ink, textAlign: 'center' },
  heroSub: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: SPACING.md },
  comingSoonBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: COLORS.ink, borderRadius: 99 },
  comingSoonText: { fontSize: 12, fontWeight: '900', color: COLORS.gold, letterSpacing: 1 },
  note: { fontSize: 12, color: COLORS.textFaint, textAlign: 'center', marginTop: SPACING.sm },
})
