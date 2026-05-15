import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Share, Alert } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import * as Haptics from 'expo-haptics'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Stack, router } from 'expo-router'
import QRCode from 'react-native-qrcode-svg'
import { useAuthStore } from '@/lib/auth-store'
import { COLORS, SPACING, RADIUS, FONT, SHADOW } from '@/lib/theme'

const APP_URL = 'https://cromos26.app'

export default function ReferralScreen() {
  const user = useAuthStore((s) => s.user)
  const [copied, setCopied] = useState(false)

  const username = user?.username ?? 'me'
  const referralCode = username.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'CROMOS26'
  const referralLink = `${APP_URL}/r/${referralCode}`

  async function copy(text: string) {
    await Clipboard.setStringAsync(text)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  async function share() {
    await Share.share({
      message: `Join me on Cromos 26 — track your sticker album and trade with collectors. Use my code ${referralCode}: ${referralLink}`,
    }).catch(() => {})
  }

  return (
    <SafeAreaView style={s.safe}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={s.title}>Your referral</Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={s.hero}>
          <Text style={s.heroEmoji}>🎁</Text>
          <Text style={s.heroTitle}>Invite friends, earn perks</Text>
          <Text style={s.heroSub}>
            Every collector who signs up with your code helps grow the trading network. Share your link or QR.
          </Text>
        </View>

        <View style={s.qrCard}>
          <View style={s.qrInner}>
            <QRCode value={referralLink} size={200} color={COLORS.ink} backgroundColor={COLORS.paper} />
          </View>
          <Text style={s.qrCaption}>Show this QR to a friend</Text>
        </View>

        <View style={s.codeRow}>
          <Text style={s.codeLabel}>YOUR CODE</Text>
          <View style={s.codeBox}>
            <Text style={s.codeText}>{referralCode}</Text>
            <TouchableOpacity onPress={() => copy(referralCode)} style={s.copyBtn}>
              <Text style={s.copyBtnText}>{copied ? '✓' : 'Copy'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={s.linkRow}>
          <Text style={s.codeLabel}>SHAREABLE LINK</Text>
          <View style={s.linkBox}>
            <Text style={s.linkText} numberOfLines={1}>{referralLink}</Text>
            <TouchableOpacity onPress={() => copy(referralLink)} style={s.copyBtn}>
              <Text style={s.copyBtnText}>{copied ? '✓' : 'Copy'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={s.shareBtn} onPress={share}>
          <Text style={s.shareBtnText}>Share invite</Text>
        </TouchableOpacity>

        <View style={s.profileCard}>
          <Text style={s.profileTitle}>Profile</Text>
          <Row label="Username" value={user?.username ?? '—'} />
          <Row label="Email" value={user?.email ?? '—'} />
          <Row label="Role" value={user?.role ?? 'customer'} />
        </View>
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

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.cream },
  scroll: { padding: SPACING.lg, paddingBottom: SPACING.xxxl },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.lg },
  backBtn: { width: 36, height: 36, borderRadius: RADIUS.md, backgroundColor: COLORS.surface2, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 22, color: COLORS.ink, lineHeight: 26 },
  title: { fontSize: FONT.size.displayL, fontWeight: FONT.weight.black, color: COLORS.ink },

  hero: { alignItems: 'center', paddingVertical: SPACING.lg },
  heroEmoji: { fontSize: 56, marginBottom: SPACING.sm },
  heroTitle: { fontSize: FONT.size.displayM, fontWeight: FONT.weight.bold, color: COLORS.ink, marginBottom: 4 },
  heroSub: { fontSize: FONT.size.bodyM, color: COLORS.textMuted, textAlign: 'center', paddingHorizontal: SPACING.xl, lineHeight: 18 },

  qrCard: { backgroundColor: COLORS.paper, borderRadius: RADIUS.xxl, padding: SPACING.xl, alignItems: 'center', marginVertical: SPACING.lg, borderWidth: 1, borderColor: COLORS.border, ...SHADOW.md },
  qrInner: { padding: SPACING.md, backgroundColor: COLORS.paper, borderRadius: RADIUS.lg },
  qrCaption: { marginTop: SPACING.md, fontSize: FONT.size.bodyM, color: COLORS.textMuted, fontWeight: FONT.weight.medium },

  codeRow: { marginVertical: SPACING.sm },
  linkRow: { marginVertical: SPACING.sm },
  codeLabel: { fontSize: FONT.size.label, fontWeight: FONT.weight.bold, color: COLORS.textMuted, letterSpacing: 1.4, marginBottom: SPACING.xs },
  codeBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.paper, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  codeText: { flex: 1, fontSize: FONT.size.displayM, fontWeight: FONT.weight.black, color: COLORS.green, letterSpacing: 2, fontFamily: 'monospace' },
  linkBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.paper, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  linkText: { flex: 1, fontSize: FONT.size.bodyM, color: COLORS.ink },
  copyBtn: { backgroundColor: COLORS.ink, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 6, marginLeft: SPACING.sm },
  copyBtnText: { color: COLORS.paper, fontWeight: FONT.weight.bold, fontSize: 12 },

  shareBtn: { backgroundColor: COLORS.green, borderRadius: RADIUS.lg, paddingVertical: SPACING.lg, alignItems: 'center', marginTop: SPACING.lg },
  shareBtnText: { color: COLORS.paper, fontWeight: FONT.weight.black, fontSize: FONT.size.bodyL },

  profileCard: { backgroundColor: COLORS.paper, borderRadius: RADIUS.xl, padding: SPACING.lg, marginTop: SPACING.xl, borderWidth: 1, borderColor: COLORS.border, ...SHADOW.sm },
  profileTitle: { fontSize: FONT.size.label, fontWeight: FONT.weight.bold, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: SPACING.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.borderSoft },
  rowLabel: { fontSize: FONT.size.bodyM, color: COLORS.textMuted },
  rowValue: { fontSize: FONT.size.bodyM, color: COLORS.ink, fontWeight: FONT.weight.medium },
})
