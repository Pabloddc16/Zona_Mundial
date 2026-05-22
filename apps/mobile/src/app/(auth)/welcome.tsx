import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, SPACING, RADIUS, FONT, SHADOW } from '@/lib/theme'

export default function WelcomeScreen() {
  function comingSoon(provider: 'google' | 'apple') {
    // Disabled placeholder until Pablo sends OAuth credentials (R4 #1).
    // Tap is a no-op for now; visual disabled state shown.
    void provider
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.content}>
        <View style={s.hero}>
          <View style={s.logoCircle}>
            <Ionicons name="trophy" size={48} color={COLORS.gold} />
          </View>
          <Text style={s.brand}>CROMOS 26</Text>
          <Text style={s.headline}>The album that lives in your pocket.</Text>
          <Text style={s.sub}>
            Track stickers. Swap with friends. Complete your World Cup 2026 collection.
          </Text>
        </View>

        <View style={s.actions}>
          <TouchableOpacity
            style={[s.btn, s.btnPrimary]}
            onPress={() => router.push('/register')}
            activeOpacity={0.85}
          >
            <Ionicons name="mail-outline" size={18} color={COLORS.paper} />
            <Text style={s.btnPrimaryText}>Create account with email</Text>
          </TouchableOpacity>

          <View style={s.divider}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>or</Text>
            <View style={s.dividerLine} />
          </View>

          <TouchableOpacity
            style={[s.btn, s.btnSecondary, s.btnDisabled]}
            onPress={() => comingSoon('google')}
            activeOpacity={1}
            disabled
          >
            <Ionicons name="logo-google" size={18} color={COLORS.textFaint} />
            <Text style={s.btnSecondaryText}>Continue with Google</Text>
            <Text style={s.soon}>SOON</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.btn, s.btnSecondary, s.btnDisabled]}
            onPress={() => comingSoon('apple')}
            activeOpacity={1}
            disabled
          >
            <Ionicons name="logo-apple" size={20} color={COLORS.textFaint} />
            <Text style={s.btnSecondaryText}>Continue with Apple</Text>
            <Text style={s.soon}>SOON</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/login')}
            style={s.signinRow}
            activeOpacity={0.7}
          >
            <Text style={s.signinText}>Already have an account? </Text>
            <Text style={s.signinLink}>Sign in</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.disclaimer}>
          Not affiliated with FIFA or Panini. By continuing you agree to our Terms and Privacy Policy.
        </Text>
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.cream },
  content: { flex: 1, paddingHorizontal: SPACING.xl, justifyContent: 'space-between', paddingBottom: SPACING.lg },

  hero: { alignItems: 'center', paddingTop: SPACING.xxxl },
  logoCircle: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: COLORS.green,
    borderWidth: 3, borderColor: COLORS.gold,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.lg,
    ...SHADOW.md,
  },
  brand: {
    fontSize: 14, fontWeight: FONT.weight.black,
    color: COLORS.green, letterSpacing: 4,
    marginBottom: SPACING.md,
  },
  headline: {
    fontSize: FONT.size.displayXL, fontWeight: FONT.weight.black,
    color: COLORS.ink, textAlign: 'center', lineHeight: 32,
    letterSpacing: -0.5, marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  sub: {
    fontSize: FONT.size.bodyL, color: COLORS.textMuted,
    textAlign: 'center', lineHeight: 22,
    paddingHorizontal: SPACING.md,
  },

  actions: { gap: SPACING.sm },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.full,
  },
  btnPrimary: {
    backgroundColor: COLORS.green,
    borderWidth: 2, borderColor: COLORS.gold,
    ...SHADOW.sm,
  },
  btnPrimaryText: { color: COLORS.paper, fontSize: FONT.size.bodyL, fontWeight: FONT.weight.black },

  btnSecondary: {
    backgroundColor: COLORS.paper,
    borderWidth: 1, borderColor: COLORS.border,
  },
  btnSecondaryText: { color: COLORS.ink, fontSize: FONT.size.bodyL, fontWeight: FONT.weight.bold },
  btnDisabled: { opacity: 0.55 },
  soon: {
    fontSize: 9, fontWeight: FONT.weight.black,
    color: COLORS.gold, backgroundColor: COLORS.ink,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
    letterSpacing: 1, marginLeft: SPACING.xs,
  },

  divider: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    marginVertical: SPACING.sm,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { fontSize: FONT.size.bodyS, color: COLORS.textFaint, fontWeight: FONT.weight.bold, textTransform: 'uppercase', letterSpacing: 1 },

  signinRow: { flexDirection: 'row', justifyContent: 'center', marginTop: SPACING.md },
  signinText: { color: COLORS.textMuted, fontSize: FONT.size.bodyM },
  signinLink: { color: COLORS.green, fontSize: FONT.size.bodyM, fontWeight: FONT.weight.black },

  disclaimer: {
    fontSize: FONT.size.bodyS, color: COLORS.textFaint,
    textAlign: 'center', lineHeight: 16,
    paddingHorizontal: SPACING.lg, marginTop: SPACING.lg,
  },
})
