/**
 * 6-digit email OTP verification (Pablo R3 #3).
 * Listens for clipboard paste of all 6 digits and autosubmits on full code.
 * Resend timer prevents spam. Uses direct Supabase client to verifyOtp.
 *
 * Wired in but currently not enforced — register API auto-confirms emails.
 * To enforce: in apps/api/src/routes/auth.ts register handler, set
 * email_confirm: false and remove the auto-signInWithPassword call, then
 * route mobile register success → /verify-otp?email=<email>.
 */
import { useState, useEffect, useRef } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { setAT, setRT } from '@/lib/api'
import { COLORS, SPACING, RADIUS, FONT } from '@/lib/theme'

const RESEND_SECONDS = 60

export default function VerifyOtpScreen() {
  const { email = '' } = useLocalSearchParams<{ email?: string }>()
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resendIn, setResendIn] = useState(RESEND_SECONDS)
  const inputs = useRef<Array<TextInput | null>>([])

  useEffect(() => {
    if (resendIn <= 0) return
    const t = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [resendIn])

  // Auto-submit when all 6 digits present.
  useEffect(() => {
    const code = digits.join('')
    if (code.length === 6 && !loading) handleVerify(code)
  }, [digits])

  function handleDigit(i: number, val: string) {
    const clean = val.replace(/\D/g, '')

    // Paste of full 6-digit code into any box.
    if (clean.length >= 6) {
      const next = clean.slice(0, 6).split('')
      setDigits(next)
      inputs.current[5]?.blur()
      return
    }

    setDigits((prev) => {
      const next = [...prev]
      next[i] = clean.slice(-1)
      return next
    })

    if (clean && i < 5) inputs.current[i + 1]?.focus()
  }

  function handleBackspace(i: number) {
    if (!digits[i] && i > 0) inputs.current[i - 1]?.focus()
  }

  async function handleVerify(token: string) {
    if (!email) return setError('Missing email')
    setError('')
    setLoading(true)
    try {
      const { data, error: vErr } = await supabase.auth.verifyOtp({
        email: String(email),
        token,
        type: 'signup',
      })
      if (vErr || !data.session) throw new Error(vErr?.message ?? 'Invalid code')
      await setAT(data.session.access_token)
      await setRT(data.session.refresh_token)
      router.replace('/')
    } catch (e) {
      setError((e as Error).message)
      setDigits(['', '', '', '', '', ''])
      inputs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    if (resendIn > 0 || !email) return
    setError('')
    try {
      await supabase.auth.resend({ type: 'signup', email: String(email) })
      setResendIn(RESEND_SECONDS)
    } catch (e) {
      setError((e as Error).message || 'Could not resend code')
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={s.content}>
          <View style={s.iconCircle}>
            <Ionicons name="mail-unread" size={36} color={COLORS.green} />
          </View>
          <Text style={s.title}>Check your email</Text>
          <Text style={s.subtitle}>
            We sent a 6-digit code to{'\n'}<Text style={s.emailText}>{email}</Text>
          </Text>

          <View style={s.boxes}>
            {digits.map((d, i) => (
              <TextInput
                key={i}
                ref={(r) => { inputs.current[i] = r }}
                style={[s.box, d ? s.boxFilled : null]}
                value={d}
                onChangeText={(v) => handleDigit(i, v)}
                onKeyPress={({ nativeEvent }) => {
                  if (nativeEvent.key === 'Backspace') handleBackspace(i)
                }}
                keyboardType="number-pad"
                maxLength={6}
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
                autoFocus={i === 0}
                editable={!loading}
                selectTextOnFocus
              />
            ))}
          </View>

          {loading ? <ActivityIndicator color={COLORS.green} style={{ marginTop: SPACING.lg }} /> : null}
          {error ? <Text style={s.error}>{error}</Text> : null}

          <TouchableOpacity
            onPress={handleResend}
            disabled={resendIn > 0}
            activeOpacity={0.7}
            style={s.resend}
          >
            <Text style={[s.resendText, resendIn > 0 && s.resendDisabled]}>
              {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.replace('/welcome')} style={s.backRow} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={14} color={COLORS.textMuted} />
            <Text style={s.backText}>Use a different email</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.cream },
  content: { flex: 1, padding: SPACING.xl, alignItems: 'center', justifyContent: 'center' },

  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.paper,
    borderWidth: 2, borderColor: COLORS.green,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  title: { fontSize: FONT.size.displayXL, fontWeight: FONT.weight.black, color: COLORS.ink, marginBottom: SPACING.sm, textAlign: 'center' },
  subtitle: { fontSize: FONT.size.bodyL, color: COLORS.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: SPACING.xxl },
  emailText: { fontWeight: FONT.weight.bold, color: COLORS.ink },

  boxes: { flexDirection: 'row', gap: SPACING.sm },
  box: {
    width: 44, height: 56,
    borderRadius: RADIUS.md,
    borderWidth: 2, borderColor: COLORS.border,
    backgroundColor: COLORS.paper,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: FONT.weight.black,
    color: COLORS.ink,
  },
  boxFilled: { borderColor: COLORS.green },

  error: { fontSize: FONT.size.bodyM, color: COLORS.red, marginTop: SPACING.lg, textAlign: 'center' },

  resend: { marginTop: SPACING.xxl },
  resendText: { fontSize: FONT.size.bodyM, color: COLORS.green, fontWeight: FONT.weight.bold },
  resendDisabled: { color: COLORS.textFaint },

  backRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: SPACING.lg },
  backText: { fontSize: FONT.size.bodyM, color: COLORS.textMuted },
})
