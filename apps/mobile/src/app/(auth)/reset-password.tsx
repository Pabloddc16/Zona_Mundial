/**
 * Reset password landing for cromos26://reset-password deep link.
 * Supabase wraps the access token in the URL fragment; expo-router exposes it
 * via useLocalSearchParams when scheme is configured.
 */
import { useState, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { api, setAT, setRT } from '@/lib/api'
import { COLORS, SPACING, RADIUS, FONT } from '@/lib/theme'

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ access_token?: string; refresh_token?: string }>()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (params.access_token) setAT(params.access_token).catch(() => {})
    if (params.refresh_token) setRT(params.refresh_token).catch(() => {})
  }, [params.access_token, params.refresh_token])

  async function handleSubmit() {
    setError('')
    if (password.length < 8) return setError('Password must be at least 8 characters')
    if (password !== confirm) return setError('Passwords don\'t match')
    setLoading(true)
    try {
      await api.auth.reset(password)
      setDone(true)
    } catch (e) {
      setError((e as Error).message || 'Could not reset password')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.content}>
          <View style={s.successIcon}>
            <Ionicons name="checkmark-circle" size={48} color={COLORS.green} />
          </View>
          <Text style={s.title}>Password updated</Text>
          <Text style={s.subtitle}>Sign in with your new password.</Text>
          <TouchableOpacity style={s.cta} onPress={() => router.replace('/login')} activeOpacity={0.85}>
            <Text style={s.ctaText}>Sign in</Text>
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
          <Text style={s.title}>Choose a new password</Text>
          <Text style={s.subtitle}>At least 8 characters.</Text>

          <View style={s.form}>
            <Text style={s.label}>New password</Text>
            <TextInput
              style={s.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor={COLORS.textFaint}
            />

            <Text style={s.label}>Confirm password</Text>
            <TextInput
              style={s.input}
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor={COLORS.textFaint}
            />

            {error ? <Text style={s.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[s.cta, (!password || !confirm || loading) && s.ctaDisabled]}
              onPress={handleSubmit}
              disabled={!password || !confirm || loading}
              activeOpacity={0.85}
            >
              {loading ? <ActivityIndicator color={COLORS.paper} /> : <Text style={s.ctaText}>Update password</Text>}
            </TouchableOpacity>
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

  successIcon: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: COLORS.cream,
    borderWidth: 2, borderColor: COLORS.green,
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: SPACING.xl,
  },
})
