/**
 * Profile tab — combines user profile, "Refiere y gana" hero, quick links,
 * and a sign-out button. Replaces standalone /referral page entry (kept
 * routable for deep links) and consolidates settings shortcuts.
 */
import { useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Share,
  Alert,
} from 'react-native'
import * as Clipboard from 'expo-clipboard'
import * as Haptics from 'expo-haptics'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import QRCode from 'react-native-qrcode-svg'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '@/lib/auth-store'
import { useAlbumStore, albumStats } from '@/lib/album-store'
import { TOTAL_STICKERS, fmt } from '@/lib/data'
import { api } from '@/lib/api'
import { COLORS, SPACING, RADIUS, FONT, SHADOW } from '@/lib/theme'

const APP_URL = 'https://zona-mundial.vercel.app'

type ReferralData = Awaited<ReturnType<typeof api.referral.me>>

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user)
  const signOut = useAuthStore((s) => s.signOut)
  const album = useAlbumStore((s) => s.album)
  const stats = albumStats(album)
  const pct = Math.round((stats.owned / TOTAL_STICKERS) * 100)

  const [copied, setCopied] = useState(false)
  const [referral, setReferral] = useState<ReferralData | null>(null)

  // Pull live referral data — code, invited count, earned + available balance.
  // Falls back to a username-derived code so guest-state still shows something
  // useful before signing in.
  useEffect(() => {
    if (!user) { setReferral(null); return }
    api.referral.me()
      .then(setReferral)
      .catch(() => { /* network — leave null, fallback below */ })
  }, [user])

  const username = user?.username ?? 'guest'
  const fallbackCode = username.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'CROMOS26'
  const referralCode = referral?.referralCode ?? fallbackCode
  // Server returns full URL; falls back to web with ?ref for shareability.
  const referralLink = referral?.shareUrl ?? `${APP_URL}/?ref=${referralCode}`

  async function copy(text: string) {
    await Clipboard.setStringAsync(text)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  async function share() {
    await Share.share({
      message: `Join me on Mundial 26 — track your sticker album and trade with collectors. Use my code ${referralCode}: ${referralLink}`,
    }).catch(() => {})
  }

  function confirmLogout() {
    Alert.alert('Sign out?', 'You can sign back in any time.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await signOut()
          router.replace('/login')
        },
      },
    ])
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>Profile</Text>
          <TouchableOpacity onPress={() => router.push('/settings')} hitSlop={8} style={s.settingsBtn}>
            <Ionicons name="settings-outline" size={20} color={COLORS.ink} style={{ opacity: 0.6 }} />
          </TouchableOpacity>
        </View>

        {/* Identity card */}
        <View style={s.idCard}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{username[0]?.toUpperCase() ?? 'G'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.username}>{username}</Text>
            <Text style={s.email}>{user?.email ?? 'Sign in to sync your album'}</Text>
          </View>
          <View style={s.pctBadge}>
            <Text style={s.pctText}>{pct}%</Text>
            <Text style={s.pctSub}>complete</Text>
          </View>
        </View>

        {/* Refiere y gana hero */}
        <View style={s.referralCard}>
          <View style={s.referralHeader}>
            <View style={s.referralIconCircle}>
              <Ionicons name="gift" size={22} color={COLORS.gold} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.referralTitle}>Invite a friend, earn 5%</Text>
              <Text style={s.referralSub}>5% of every purchase your friend makes lands in your wallet.</Text>
            </View>
          </View>

          <View style={s.qrWrap}>
            <View style={s.qrBox}>
              <QRCode value={referralLink} size={150} backgroundColor="#FAF6EE" color={COLORS.ink} />
            </View>
            <Text style={s.code}>{referralCode}</Text>
          </View>

          <View style={s.actionRow}>
            <TouchableOpacity onPress={() => copy(referralLink)} style={s.actionBtn}>
              <Ionicons name={copied ? 'checkmark' : 'link-outline'} size={16} color={COLORS.green} />
              <Text style={s.actionBtnText}>{copied ? 'Link copied' : 'Copy link'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={share} style={[s.actionBtn, s.actionBtnPrimary]}>
              <Ionicons name="share-social" size={16} color={COLORS.paper} />
              <Text style={[s.actionBtnText, { color: COLORS.paper }]}>Share</Text>
            </TouchableOpacity>
          </View>

          <View style={s.statRow}>
            <Stat label="Invited" value={String(referral?.invitedCount ?? 0)} />
            <View style={s.statDivider} />
            <Stat label="Earned" value={fmt(referral?.totalEarned ?? 0)} />
            <View style={s.statDivider} />
            <Stat label="Available" value={fmt(referral?.balance ?? 0)} />
          </View>
        </View>

        {/* Quick links */}
        <View style={s.links}>
          <Link icon="receipt-outline" label="Order history" onPress={() => router.push('/orden')} />
          <Link icon="location-outline" label="Saved addresses" onPress={() => Alert.alert('Coming soon', 'Save your delivery addresses for one-tap checkout.')} />
          <Link icon="notifications-outline" label="Notifications" onPress={() => router.push('/settings')} />
          <Link icon="help-circle-outline" label="Help & FAQ" onPress={() => Alert.alert('Help', 'Reach us at stulanik@gmail.com')} />
          <Link icon="information-circle-outline" label="About the app" onPress={() => router.push('/settings')} />
        </View>

        {/* Sign out */}
        <TouchableOpacity onPress={confirmLogout} style={s.signOutBtn}>
          <Ionicons name="log-out-outline" size={18} color={COLORS.red} />
          <Text style={s.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.statItem}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  )
}

function Link({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  onPress: () => void
}) {
  return (
    <TouchableOpacity onPress={onPress} style={s.linkRow} activeOpacity={0.7}>
      <Ionicons name={icon} size={20} color={COLORS.ink} style={{ opacity: 0.7 }} />
      <Text style={s.linkLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={COLORS.textFaint} />
    </TouchableOpacity>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.cream },
  scroll: { padding: SPACING.lg, paddingBottom: SPACING.xxxl },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.lg },
  title: { fontSize: 26, fontWeight: FONT.weight.black, color: COLORS.ink, letterSpacing: -0.5 },
  settingsBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },

  /* Identity card */
  idCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.paper,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
    ...SHADOW.sm,
  },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.green,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 24, fontWeight: '900', color: COLORS.gold },
  username: { fontSize: 18, fontWeight: '900', color: COLORS.ink },
  email: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  pctBadge: { alignItems: 'flex-end' },
  pctText: { fontSize: 20, fontWeight: '900', color: COLORS.green },
  pctSub: { fontSize: 9, color: COLORS.textMuted, fontWeight: '700', letterSpacing: 1 },

  /* Referral card */
  referralCard: {
    backgroundColor: COLORS.green,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 2,
    borderColor: COLORS.gold,
    marginBottom: SPACING.lg,
  },
  referralHeader: { flexDirection: 'row', gap: SPACING.md, alignItems: 'center', marginBottom: SPACING.md },
  referralIconCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,209,0,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  referralTitle: { fontSize: 17, fontWeight: '900', color: COLORS.paper, marginBottom: 2 },
  referralSub: { fontSize: 12, color: 'rgba(255,255,255,0.85)', lineHeight: 16 },

  qrWrap: { alignItems: 'center', marginVertical: SPACING.md, gap: 8 },
  qrBox: { padding: 12, backgroundColor: COLORS.cream, borderRadius: RADIUS.md },
  code: { fontSize: 14, fontWeight: '900', color: COLORS.gold, letterSpacing: 2 },

  actionRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: COLORS.cream,
    paddingVertical: 10, borderRadius: 99,
  },
  actionBtnPrimary: { backgroundColor: COLORS.ink },
  actionBtnText: { fontSize: 13, fontWeight: '900', color: COLORS.green },

  statRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: '900', color: COLORS.gold },
  statLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.75)', letterSpacing: 1, marginTop: 2 },
  statDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.15)' },

  /* Quick links */
  links: {
    backgroundColor: COLORS.paper,
    borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border,
    marginBottom: SPACING.lg,
    overflow: 'hidden',
  },
  linkRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderSoft,
  },
  linkLabel: { flex: 1, fontSize: 14, fontWeight: '700', color: COLORS.ink },

  /* Sign out */
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(206,17,38,0.08)',
  },
  signOutText: { fontSize: 14, fontWeight: '800', color: COLORS.red },
})
