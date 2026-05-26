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
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }
    setLoading(true)
    try {
      const body: { email: string; password: string; username?: string } = {
        email: email.trim().toLowerCase(),
        password,
      }
      const uname = username.trim()
      if (uname) body.username = uname
      await signUp(body)
      router.replace('/')
    } catch (e) {
      setError((e as Error).message || 'Error al crear la cuenta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={s.content}>
          <Text style={s.brand}>Cromos 26</Text>
          <Text style={s.title}>Crear cuenta</Text>
          <Text style={s.subtitle}>Marca estampas, intercambia con amigos</Text>

          <View style={s.form}>
            <Text style={s.label}>Usuario</Text>
            <TextInput
              style={s.input}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              placeholder="opcional"
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
              placeholder="tu@email.com"
              placeholderTextColor={COLORS.textFaint}
            />

            <Text style={s.label}>Contraseña</Text>
            <TextInput
              style={s.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="al menos 8 caracteres"
              placeholderTextColor={COLORS.textFaint}
            />

            {error ? <Text style={s.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[s.cta, (!email || !password || loading) && s.ctaDisabled]}
              onPress={handleSubmit}
              disabled={!email || !password || loading}
              activeOpacity={0.85}
            >
              {loading ? <ActivityIndicator color={COLORS.paper} /> : <Text style={s.ctaText}>Crear cuenta</Text>}
            </TouchableOpacity>

            <View style={s.footer}>
              <Text style={s.footerText}>¿Ya tienes cuenta? </Text>
              <Link href="/login" style={s.link}>Iniciar sesión</Link>
            </View>

            <Text style={s.disclaimer}>
              No afiliado con FIFA o Panini. Al crear una cuenta aceptas nuestros
              Términos y Política de Privacidad.
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
