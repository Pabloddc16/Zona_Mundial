/**
 * Sign-in prompt shown to guest users on account-gated screens (cart,
 * checkout, profile). Apple Guideline 5.1.1(v) lets us require accounts
 * for "account-based features"; we just can't gate the whole app behind
 * registration. So this component renders in place of the screen when
 * `guest && !user`, giving the user a friendly "Sign in to use this"
 * call to action without blocking the album / store browsing experience.
 */
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, SPACING, RADIUS, FONT } from '@/lib/theme'

interface Props {
  title: string
  body: string
  iconName: keyof typeof Ionicons.glyphMap
}

export function GuestPrompt({ title, body, iconName }: Props) {
  // Don't flip guest=false here — AuthGate would immediately redirect to
  // /welcome and race with this navigation, crashing the navigator.
  // Auth actions (signIn / signUp / signInWith*) clear the guest flag in
  // the auth-store after they succeed, so the user lands cleanly on /.
  function signUp() {
    router.push('/register')
  }
  function signIn() {
    router.push('/login')
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.center}>
        <View style={s.iconCircle}>
          <Ionicons name={iconName} size={48} color={COLORS.green} />
        </View>
        <Text style={s.title}>{title}</Text>
        <Text style={s.body}>{body}</Text>

        <TouchableOpacity onPress={signUp} style={s.primaryBtn} activeOpacity={0.85}>
          <Text style={s.primaryText}>Crear cuenta gratis</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={signIn} style={s.secondaryBtn} activeOpacity={0.7}>
          <Text style={s.secondaryText}>Ya tengo cuenta</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.cream },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.xl, gap: SPACING.md },
  iconCircle: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: COLORS.paper,
    borderWidth: 2, borderColor: COLORS.green,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  title: { fontSize: FONT.size.displayL, fontWeight: FONT.weight.black, color: COLORS.ink, textAlign: 'center' },
  body: { fontSize: FONT.size.bodyM, color: COLORS.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: SPACING.lg },
  primaryBtn: {
    backgroundColor: COLORS.green, borderWidth: 2, borderColor: COLORS.gold,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.xxl, paddingVertical: SPACING.md,
  },
  primaryText: { color: COLORS.paper, fontWeight: FONT.weight.black, fontSize: FONT.size.bodyL },
  secondaryBtn: { paddingVertical: SPACING.sm },
  secondaryText: { color: COLORS.green, fontWeight: FONT.weight.bold, fontSize: FONT.size.bodyM },
})
