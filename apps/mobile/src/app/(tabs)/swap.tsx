import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, Clipboard } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { useAlbumStore } from '@/lib/album-store'
import { ALBUM } from '@/lib/data'

type Mode = 'offer' | 'scan'
interface SwapPayload { extras: string[]; needed: string[]; v: number }

export default function SwapScreen() {
  const [mode, setMode] = useState<Mode>('offer')
  const [code, setCode] = useState('')
  const [parsed, setParsed] = useState<SwapPayload | null>(null)
  const [parseError, setParseError] = useState('')
  const album = useAlbumStore((s) => s.album)

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

  const payload: SwapPayload = { extras, needed, v: 1 }
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64')

  function copyCode() {
    Clipboard.setString(encoded)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
    Alert.alert('Copiado', 'Comparte el código con otro coleccionista.')
  }

  function parseScan() {
    setParseError('')
    try {
      const decoded = JSON.parse(Buffer.from(code.trim(), 'base64').toString()) as SwapPayload
      if (!decoded.extras || !decoded.needed) throw new Error('invalid')
      setParsed(decoded)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
    } catch {
      setParseError('Código inválido.')
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {})
    }
  }

  const theyHaveINeed = parsed ? parsed.extras.filter((c) => needed.includes(c)) : []
  const iHaveTheyNeed = parsed ? extras.filter((c) => parsed.needed.includes(c)) : []

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.title}>Swap</Text>

        <View style={s.tabRow}>
          {(['offer', 'scan'] as Mode[]).map((m) => (
            <TouchableOpacity key={m} onPress={() => setMode(m)} style={[s.tabBtn, mode === m && s.tabActive]}>
              <Text style={[s.tabLabel, mode === m && s.tabLabelActive]}>{m === 'offer' ? 'Mi oferta' : 'Escanear'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {mode === 'offer' && (
          <View style={{ gap: 12 }}>
            <View style={s.statRow}>
              <View style={[s.statCard, { backgroundColor: 'rgba(0,99,65,0.08)' }]}>
                <Text style={[s.statNum, { color: '#006341' }]}>{extras.length}</Text>
                <Text style={[s.statLabel, { color: '#006341' }]}>Tengo extra</Text>
              </View>
              <View style={[s.statCard, { backgroundColor: 'rgba(206,17,38,0.08)' }]}>
                <Text style={[s.statNum, { color: '#CE1126' }]}>{needed.length}</Text>
                <Text style={[s.statLabel, { color: '#CE1126' }]}>Busco</Text>
              </View>
            </View>

            {extras.length === 0 && needed.length === 0 ? (
              <View style={s.emptyBox}>
                <Text style={{ fontSize: 40, marginBottom: 8 }}>📚</Text>
                <Text style={s.emptyText}>Marca estampas en el álbum para generar tu código de swap</Text>
              </View>
            ) : (
              <>
                {extras.length > 0 && <ChipGroup label={`Mis extras (${extras.length})`} codes={extras} color="#006341" bg="rgba(0,99,65,0.1)" />}
                {needed.length > 0 && <ChipGroup label={`Busco (${needed.length})`} codes={needed} color="#CE1126" bg="rgba(206,17,38,0.08)" />}
                <TouchableOpacity style={s.btn} onPress={copyCode}>
                  <Text style={s.btnText}>Copiar mi código de swap</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {mode === 'scan' && (
          <View style={{ gap: 12 }}>
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder="Pega aquí el código de swap..."
              multiline
              numberOfLines={4}
              style={s.input}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {parseError ? <Text style={{ color: '#CE1126', fontSize: 13 }}>{parseError}</Text> : null}
            <TouchableOpacity style={s.btn} onPress={parseScan}>
              <Text style={s.btnText}>Ver coincidencias</Text>
            </TouchableOpacity>

            {parsed && (
              <View style={{ gap: 10 }}>
                {theyHaveINeed.length > 0
                  ? <ChipGroup label={`Ellos tienen lo que buscas (${theyHaveINeed.length})`} codes={theyHaveINeed} color="#006341" bg="rgba(0,99,65,0.08)" />
                  : <Text style={s.emptyText}>No tienen estampas que busques</Text>}
                {iHaveTheyNeed.length > 0
                  ? <ChipGroup label={`Tú tienes lo que buscan (${iHaveTheyNeed.length})`} codes={iHaveTheyNeed} color="#92400E" bg="rgba(255,209,0,0.15)" />
                  : <Text style={s.emptyText}>No tienes extras que ellos busquen</Text>}
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
      <Text style={{ fontSize: 11, fontWeight: '700', color: '#9CA3AF', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>{label}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {codes.map((c) => (
          <View key={c} style={{ backgroundColor: bg, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ color, fontWeight: '700', fontSize: 11, fontFamily: 'monospace' }}>{c}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FEFCE8' },
  scroll: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 26, fontWeight: '800', color: '#1C1917', marginBottom: 16 },
  tabRow: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 12, padding: 4, marginBottom: 16, gap: 4 },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  tabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  tabLabel: { fontSize: 13, fontWeight: '600', color: '#9CA3AF' },
  tabLabelActive: { color: '#1C1917' },
  statRow: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, borderRadius: 16, padding: 16, alignItems: 'center' },
  statNum: { fontSize: 32, fontWeight: '900' },
  statLabel: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  emptyBox: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },
  btn: { backgroundColor: '#006341', borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  input: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', padding: 12, fontSize: 13, minHeight: 100, textAlignVertical: 'top', fontFamily: 'monospace' },
})
