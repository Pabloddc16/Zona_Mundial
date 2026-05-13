import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native'
import { Link, router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuthStore } from '@/lib/auth-store'
import { COLORS, SPACING, RADIUS, FONT } from '@/lib/theme'

export default function RegisterScreen() {
  const signUp = useAuthStore((s) => s.signUp)
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    setError('')
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    try {
      await signUp({ email: email.trim().toLowerCase(), password, username: username.trim() || undefined })
      router.replace('/')
    } catch (e) {
      setError((e as Error).message || 'Sign up failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={s.content}>
          <Text style={s.brand}>Cromos 26</Text>
          <Text style={s.title}>Create account</Text>
          <Text style={s.subtitle}>Track stickers, swap with friends</Text>

          <View style={s.form}>
            <Text style={s.label}>Username</Text>
            <TextInput
              style={s.input}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              placeholder="optional"
              placeholderTextColor={COLORS.textFaint}
            />

            <Text style={s.label}>Email</Text>
            <TextInput
              style={s.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              placeholder="you@example.com"
              placeholderTextColor={COLORS.textFaint}
            />

            <Text style={s.label}>Password</Text>
            <TextInput
              style={s.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="at least 8 characters"
              placeholderTextColor={COLORS.textFaint}
            />

            {error ? <Text style={s.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[s.cta, (!email || !password || loading) && s.ctaDisabled]}
              onPress={handleSubmit}
              disabled={!email || !password || loading}
              activeOpacity={0.85}
            >
              {loading ? <ActivityIndicator color={COLORS.paper} /> : <Text style={s.ctaText}>Create account</Text>}
            </TouchableOpacity>

            <View style={s.footer}>
              <Text style={s.footerText}>Already have an account? </Text>
              <Link href="/login" style={s.link}>Sign in</Link>
            </View>

            <Text style={s.disclaimer}>
              Not affiliated with FIFA or Panini. By creating an account you agree to our
              Terms and Privacy Policy.
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.cream },
  content: { flex: 1, padding: SPACING.xl, justifyContent: 'center' },
  brand: { fontSize: FONT.size.bodyM, fontWeight: FONT.weight.black, color: COLORS.green, letterSpacing: 2, textTransform: 'uppercase', marginBottom: SPACING.lg },
  title: { fontSize: FONT.size.displayXXL, fontWeight: FONT.weight.black, color: COLORS.ink, marginBottom: SPACING.xs },
  subtitle: { fontSize: FONT.size.bodyL, color: COLORS.textMuted, marginBottom: SPACING.xxl },
  form: { gap: SPACING.md },
  label: { fontSize: FONT.size.label, fontWeight: FONT.weight.bold, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1.4, marginTop: SPACING.md },
  input: { backgroundColor: COLORS.paper, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, fontSize: FONT.size.bodyL, color: COLORS.ink },
  error: { fontSize: FONT.size.bodyM, color: COLORS.red, marginTop: SPACING.sm },
  cta: { backgroundColor: COLORS.ink, borderRadius: RADIUS.lg, paddingVertical: SPACING.lg, alignItems: 'center', marginTop: SPACING.lg },
  ctaDisabled: { opacity: 0.5 },
  ctaText: { color: COLORS.paper, fontSize: FONT.size.bodyL, fontWeight: FONT.weight.bold },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: SPACING.xl },
  footerText: { color: COLORS.textMuted, fontSize: FONT.size.bodyM },
  link: { color: COLORS.green, fontSize: FONT.size.bodyM, fontWeight: FONT.weight.bold },
  disclaimer: { fontSize: FONT.size.bodyS, color: COLORS.textFaint, textAlign: 'center', marginTop: SPACING.xl, lineHeight: 16 },
})
