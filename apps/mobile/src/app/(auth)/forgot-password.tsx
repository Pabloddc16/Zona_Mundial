import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native'
import { Link, router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { api } from '@/lib/api'
import { COLORS, SPACING, RADIUS, FONT } from '@/lib/theme'

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  async function handleSubmit() {
    setError('')
    setLoading(true)
    try {
      await api.auth.requestReset(email.trim().toLowerCase())
      setSent(true)
    } catch (e) {
      setError((e as Error).message || 'Could not send reset email')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.content}>
          <View style={s.successIcon}>
            <Ionicons name="mail" size={48} color={COLORS.green} />
          </View>
          <Text style={s.title}>Check your inbox</Text>
          <Text style={s.subtitle}>
            If an account exists for {email}, we sent a reset link. It expires in 60 minutes.
          </Text>
          <TouchableOpacity style={s.cta} onPress={() => router.replace('/login')} activeOpacity={0.85}>
            <Text style={s.ctaText}>Back to sign in</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={s.content}>
          <Text style={s.brand}>Cromos 26</Text>
          <Text style={s.title}>Forgot password?</Text>
          <Text style={s.subtitle}>Enter your email — we'll send you a reset link.</Text>

          <View style={s.form}>
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

            {error ? <Text style={s.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[s.cta, (!email || loading) && s.ctaDisabled]}
              onPress={handleSubmit}
              disabled={!email || loading}
              activeOpacity={0.85}
            >
              {loading ? <ActivityIndicator color={COLORS.paper} /> : <Text style={s.ctaText}>Send reset link</Text>}
            </TouchableOpacity>

            <View style={s.footer}>
              <Link href="/login" style={s.link}>Back to sign in</Link>
            </View>
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
  title: { fontSize: FONT.size.displayXL, fontWeight: FONT.weight.black, color: COLORS.ink, marginBottom: SPACING.xs },
  subtitle: { fontSize: FONT.size.bodyL, color: COLORS.textMuted, marginBottom: SPACING.xxl, lineHeight: 22 },
  form: { gap: SPACING.md },
  label: { fontSize: FONT.size.label, fontWeight: FONT.weight.bold, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1.4, marginTop: SPACING.md },
  input: { backgroundColor: COLORS.paper, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, fontSize: FONT.size.bodyL, color: COLORS.ink },
  error: { fontSize: FONT.size.bodyM, color: COLORS.red, marginTop: SPACING.sm },
  cta: { backgroundColor: COLORS.green, borderWidth: 2, borderColor: COLORS.gold, borderRadius: RADIUS.full, paddingVertical: SPACING.lg, alignItems: 'center', marginTop: SPACING.lg },
  ctaDisabled: { opacity: 0.5 },
  ctaText: { color: COLORS.paper, fontSize: FONT.size.bodyL, fontWeight: FONT.weight.black },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: SPACING.xl },
  link: { color: COLORS.green, fontSize: FONT.size.bodyM, fontWeight: FONT.weight.bold },

  successIcon: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: COLORS.cream,
    borderWidth: 2, borderColor: COLORS.green,
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: SPACING.xl,
  },
})
