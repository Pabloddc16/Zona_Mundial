import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, Stack } from 'expo-router'
import { useAuthStore } from '@/lib/auth-store'
import { COLORS, SPACING, RADIUS, FONT, SHADOW } from '@/lib/theme'

const PRIVACY_URL = 'https://zona-mundial.vercel.app/privacy'
const TERMS_URL = 'https://zona-mundial.vercel.app/terms'

export default function SettingsScreen() {
  const user = useAuthStore((s) => s.user)
  const signOut = useAuthStore((s) => s.signOut)
  const deleteAccount = useAuthStore((s) => s.deleteAccount)
  const [busy, setBusy] = useState(false)

  function confirmLogout() {
    Alert.alert('Sign out?', 'You can sign back in any time.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: async () => { await signOut(); router.replace('/login') } },
    ])
  }

  function confirmDelete() {
    Alert.alert(
      'Delete account?',
      'This permanently removes your account, album, and all data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete forever',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you absolutely sure?',
              'Your album progress and trade history will be lost.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, delete',
                  style: 'destructive',
                  onPress: async () => {
                    setBusy(true)
                    try { await deleteAccount(); router.replace('/login') }
                    catch (e) { Alert.alert('Failed', (e as Error).message); setBusy(false) }
                  },
                },
              ],
            )
          },
        },
      ],
    )
  }

  return (
    <SafeAreaView style={s.safe}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.title}>Settings</Text>

        {/* Account card */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Account</Text>
          <View style={s.card}>
            <Row label="Username" value={user?.username ?? '—'} />
            <Row label="Email" value={user?.email ?? '—'} />
          </View>
        </View>

        {/* Legal */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Legal</Text>
          <View style={s.card}>
            <ActionRow label="Privacy Policy" onPress={() => Linking.openURL(PRIVACY_URL)} />
            <ActionRow label="Terms of Service" onPress={() => Linking.openURL(TERMS_URL)} />
          </View>
        </View>

        {/* Disclaimer */}
        <Text style={s.disclaimer}>
          This app is not affiliated with, endorsed by, or sponsored by FIFA, Panini, or any
          related entity. All trademarks are property of their respective owners.
        </Text>

        {/* Sign out */}
        <TouchableOpacity style={s.signOutBtn} onPress={confirmLogout} disabled={busy}>
          <Text style={s.signOutText}>Sign out</Text>
        </TouchableOpacity>

        {/* Danger zone */}
        <Text style={s.dangerLabel}>Danger zone</Text>
        <TouchableOpacity style={s.deleteBtn} onPress={confirmDelete} disabled={busy}>
          <Text style={s.deleteText}>{busy ? 'Deleting…' : 'Delete account permanently'}</Text>
        </TouchableOpacity>
        <Text style={s.dangerHint}>
          Removes your account, album, and trade data from our servers.
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue} numberOfLines={1}>{value}</Text>
    </View>
  )
}

function ActionRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={0.7}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowChevron}>›</Text>
    </TouchableOpacity>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.cream },
  scroll: { padding: SPACING.lg, paddingBottom: SPACING.xxxl },
  title: { fontSize: FONT.size.displayXL, fontWeight: FONT.weight.black, color: COLORS.ink, marginBottom: SPACING.lg },
  section: { marginBottom: SPACING.lg },
  sectionLabel: { fontSize: FONT.size.label, fontWeight: FONT.weight.bold, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: SPACING.sm },
  card: { backgroundColor: COLORS.paper, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', ...SHADOW.sm },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.borderSoft },
  rowLabel: { fontSize: FONT.size.bodyL, color: COLORS.ink, fontWeight: FONT.weight.medium, flex: 1 },
  rowValue: { fontSize: FONT.size.bodyL, color: COLORS.textMuted, fontWeight: FONT.weight.medium, marginLeft: SPACING.md, flexShrink: 1 },
  rowChevron: { fontSize: 22, color: COLORS.textFaint, fontWeight: FONT.weight.bold },
  disclaimer: { fontSize: FONT.size.bodyS, color: COLORS.textMuted, marginVertical: SPACING.lg, lineHeight: 16, fontStyle: 'italic' },
  signOutBtn: { backgroundColor: COLORS.ink, borderRadius: RADIUS.lg, paddingVertical: SPACING.lg, alignItems: 'center', marginTop: SPACING.md },
  signOutText: { color: COLORS.paper, fontSize: FONT.size.bodyL, fontWeight: FONT.weight.bold },
  dangerLabel: { fontSize: FONT.size.label, fontWeight: FONT.weight.bold, color: COLORS.red, textTransform: 'uppercase', letterSpacing: 1.4, marginTop: SPACING.xxl, marginBottom: SPACING.sm },
  deleteBtn: { backgroundColor: 'transparent', borderRadius: RADIUS.lg, paddingVertical: SPACING.lg, alignItems: 'center', borderWidth: 1, borderColor: COLORS.red },
  deleteText: { color: COLORS.red, fontSize: FONT.size.bodyL, fontWeight: FONT.weight.bold },
  dangerHint: { fontSize: FONT.size.bodyS, color: COLORS.textMuted, marginTop: SPACING.sm, lineHeight: 16 },
})
