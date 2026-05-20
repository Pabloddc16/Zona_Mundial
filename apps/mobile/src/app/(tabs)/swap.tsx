import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import * as Haptics from 'expo-haptics'
import { SafeAreaView } from 'react-native-safe-area-context'
import QRCode from 'react-native-qrcode-svg'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useAlbumStore } from '@/lib/album-store'
import { useAuthStore } from '@/lib/auth-store'
import { ALBUM } from '@/lib/data'
import { encodeOffer, decodePayload } from '@/lib/swap-qr'
import { COLORS, SPACING, RADIUS, FONT, SHADOW } from '@/lib/theme'

type Mode = 'offer' | 'scan'

export default function SwapScreen() {
  const [mode, setMode] = useState<Mode>('offer')
  const [scanned, setScanned] = useState<{ extras: string[]; needed: string[]; user: string } | null>(null)
  const [permission, requestPermission] = useCameraPermissions()
  const [scanLock, setScanLock] = useState(false)

  const album = useAlbumStore((s) => s.album)
  const user = useAuthStore((s) => s.user)

  const extras: string[] = []
  const needed: string[] = []
  for (const g of ALBUM) {
    const gs = album[g.id] ?? {}
    for (const s of g.stickers) {
      const st = gs[s.n]
      if ((st?.owned ?? 0) > 1) extras.push(s.code)
      if ((st?.needed ?? 0) > 0) needed.push(s.code)
    }
  }

  const username = user?.username ?? 'anon'
  const qrPayload = encodeOffer({ username, repetidas: extras, faltantes: needed })

  function copyCode() {
    Clipboard.setStringAsync(qrPayload)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
    Alert.alert('Copied', 'Share the code with another collector.')
  }

  function handleScan({ data }: { data: string }) {
    if (scanLock) return
    setScanLock(true)
    const decoded = decodePayload(data)
    if (!decoded || decoded.t !== 'o') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {})
      Alert.alert('Invalid code', 'This QR is not a Mundial 26 swap offer.')
      setTimeout(() => setScanLock(false), 1500)
      return
    }
    setScanned({ extras: decoded.r, needed: decoded.n ?? [], user: decoded.u })
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
  }

  const theyHaveINeed = scanned ? scanned.extras.filter((c) => needed.includes(c)) : []
  const iHaveTheyNeed = scanned ? extras.filter((c) => scanned.needed.includes(c)) : []

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={s.title}>Swap</Text>
          <TouchableOpacity onPress={() => router.push('/settings')} hitSlop={8} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="settings-outline" size={20} color={COLORS.ink} style={{ opacity: 0.6 }} />
          </TouchableOpacity>
        </View>

        <View style={s.tabRow}>
          {(['offer', 'scan'] as Mode[]).map((m) => (
            <TouchableOpacity key={m} onPress={() => { setMode(m); setScanned(null); setScanLock(false) }} style={[s.tabBtn, mode === m && s.tabActive]}>
              <Text style={[s.tabLabel, mode === m && s.tabLabelActive]}>{m === 'offer' ? 'My offer' : 'Scan'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {mode === 'offer' && (
          <View style={{ gap: SPACING.md }}>
            <View style={s.statRow}>
              <View style={[s.statCard, { backgroundColor: 'rgba(0,99,65,0.08)' }]}>
                <Text style={[s.statNum, { color: COLORS.green }]}>{extras.length}</Text>
                <Text style={[s.statLabel, { color: COLORS.green }]}>Duplicates</Text>
              </View>
              <View style={[s.statCard, { backgroundColor: 'rgba(206,17,38,0.08)' }]}>
                <Text style={[s.statNum, { color: COLORS.red }]}>{needed.length}</Text>
                <Text style={[s.statLabel, { color: COLORS.red }]}>Needed</Text>
              </View>
            </View>

            {extras.length === 0 && needed.length === 0 ? (
              <View style={s.emptyBox}>
                <Ionicons name="book-outline" size={48} color={COLORS.textMuted} style={{ marginBottom: SPACING.sm }} />
                <Text style={s.emptyText}>Mark stickers in your album to generate your swap code</Text>
              </View>
            ) : (
              <>
                <View style={s.qrCard}>
                  <QRCode value={qrPayload} size={220} color={COLORS.ink} backgroundColor={COLORS.paper} />
                  <Text style={s.qrCaption}>Show this to a friend</Text>
                </View>
                <TouchableOpacity style={s.btn} onPress={copyCode}>
                  <Text style={s.btnText}>Copy code</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {mode === 'scan' && (
          <View style={{ gap: SPACING.md }}>
            {!permission?.granted ? (
              <View style={s.permCard}>
                <View style={s.permIconWrap}>
                  <Ionicons name="camera-outline" size={40} color={COLORS.green} />
                </View>
                <Text style={s.permTitle}>Camera access needed</Text>
                <Text style={s.permSub}>Scan QR codes from other collectors to find sticker swap matches.</Text>
                <TouchableOpacity style={s.permBtn} onPress={requestPermission} activeOpacity={0.85}>
                  <Ionicons name="camera" size={18} color={COLORS.paper} />
                  <Text style={s.permBtnText}>Enable camera</Text>
                </TouchableOpacity>
                <Text style={s.permHint}>You can change this anytime in Settings.</Text>
              </View>
            ) : scanned ? (
              <>
                <View style={s.scanResult}>
                  <Text style={s.scanResultUser}>From: @{scanned.user}</Text>
                  {theyHaveINeed.length > 0
                    ? <ChipGroup label={`They have what you need (${theyHaveINeed.length})`} codes={theyHaveINeed} color={COLORS.green} bg="rgba(0,99,65,0.08)" />
                    : <Text style={s.emptyText}>No matches for stickers you need</Text>}
                  {iHaveTheyNeed.length > 0
                    ? <ChipGroup label={`You have what they need (${iHaveTheyNeed.length})`} codes={iHaveTheyNeed} color={COLORS.goldDark} bg="rgba(255,209,0,0.18)" />
                    : <Text style={s.emptyText}>No matches for stickers they need</Text>}
                </View>
                <TouchableOpacity style={s.btn} onPress={() => { setScanned(null); setScanLock(false) }}>
                  <Text style={s.btnText}>Scan another</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={s.cameraWrap}>
                <CameraView
                  style={s.camera}
                  facing="back"
                  barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                  onBarcodeScanned={handleScan}
                />
                <Text style={s.cameraHint}>Point at a Mundial 26 swap QR code</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function ChipGroup({ label, codes, color, bg }: { label: string; codes: string[]; color: string; bg: string }) {
  return (
    <View>
      <Text style={s.chipLabel}>{label}</Text>
      <View style={s.chipRow}>
        {codes.map((c) => (
          <View key={c} style={[s.chip, { backgroundColor: bg }]}>
            <Text style={[s.chipText, { color }]}>{c}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.cream },
  scroll: { padding: SPACING.lg, paddingBottom: SPACING.xxxl },
  title: { fontSize: FONT.size.displayXL, fontWeight: FONT.weight.black, color: COLORS.ink, marginBottom: SPACING.lg },
  tabRow: { flexDirection: 'row', backgroundColor: COLORS.surface2, borderRadius: RADIUS.md, padding: 4, marginBottom: SPACING.lg, gap: 4 },
  tabBtn: { flex: 1, paddingVertical: SPACING.sm, borderRadius: RADIUS.sm, alignItems: 'center' },
  tabActive: { backgroundColor: COLORS.paper, ...SHADOW.sm },
  tabLabel: { fontSize: FONT.size.bodyM, fontWeight: FONT.weight.bold, color: COLORS.textMuted },
  tabLabelActive: { color: COLORS.ink },
  statRow: { flexDirection: 'row', gap: SPACING.md },
  statCard: { flex: 1, borderRadius: RADIUS.xl, padding: SPACING.lg, alignItems: 'center' },
  statNum: { fontSize: 36, fontWeight: FONT.weight.black },
  statLabel: { fontSize: FONT.size.bodyS, fontWeight: FONT.weight.bold, textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 },
  emptyBox: { alignItems: 'center', paddingVertical: SPACING.xxl, paddingHorizontal: SPACING.lg },
  emptyText: { fontSize: FONT.size.bodyM, color: COLORS.textMuted, textAlign: 'center' },
  permCard: { backgroundColor: COLORS.paper, borderRadius: RADIUS.xxl, padding: SPACING.xl, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, ...SHADOW.md, marginTop: SPACING.md },
  permIconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(0,99,65,0.10)', alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.lg },
  permTitle: { fontSize: FONT.size.displayM, fontWeight: FONT.weight.bold, color: COLORS.ink, marginBottom: SPACING.xs },
  permSub: { fontSize: FONT.size.bodyM, color: COLORS.textMuted, textAlign: 'center', marginBottom: SPACING.lg, lineHeight: 18, paddingHorizontal: SPACING.lg },
  permBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.green, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md },
  permBtnText: { color: COLORS.paper, fontWeight: FONT.weight.bold, fontSize: FONT.size.bodyL },
  permHint: { fontSize: FONT.size.bodyS, color: COLORS.textFaint, marginTop: SPACING.md },
  qrCard: { backgroundColor: COLORS.paper, borderRadius: RADIUS.xxl, padding: SPACING.xl, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, ...SHADOW.md },
  qrCaption: { fontSize: FONT.size.bodyM, color: COLORS.textMuted, marginTop: SPACING.md, fontWeight: FONT.weight.medium },
  btn: { backgroundColor: COLORS.ink, borderRadius: RADIUS.lg, paddingVertical: SPACING.lg, alignItems: 'center' },
  btnText: { color: COLORS.paper, fontWeight: FONT.weight.bold, fontSize: FONT.size.bodyL },
  cameraWrap: { borderRadius: RADIUS.xxl, overflow: 'hidden', backgroundColor: COLORS.ink, alignItems: 'center', padding: SPACING.md },
  camera: { width: '100%', aspectRatio: 1, borderRadius: RADIUS.xl, overflow: 'hidden' },
  cameraHint: { color: COLORS.paper, opacity: 0.7, fontSize: FONT.size.bodyM, marginTop: SPACING.md },
  scanResult: { backgroundColor: COLORS.paper, borderRadius: RADIUS.xl, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border, gap: SPACING.md },
  scanResultUser: { fontSize: FONT.size.bodyM, fontWeight: FONT.weight.bold, color: COLORS.ink },
  chipLabel: { fontSize: FONT.size.label, fontWeight: FONT.weight.bold, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: SPACING.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderRadius: RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: 4 },
  chipText: { fontWeight: FONT.weight.bold, fontSize: FONT.size.bodyS, fontFamily: 'monospace' },
})
