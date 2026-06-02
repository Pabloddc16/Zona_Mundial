/**
 * Mi Panini wizard — selfie → personalized sticker.
 *
 * State machine (5 steps):
 *   1. card-type    — Common/Bronze/Silver/Gold rarity frame
 *   2. identity     — name + country
 *   3. stats        — FIFA-style pace/shooting/passing/defending
 *   4. photo        — take or pick selfie, crops to square
 *   5. preview      — confirm + add to cart ($200) → checkout
 *
 * On add-to-cart:
 *   - Generates a draft ID (e.g. MI-PANINI-AB12CDEF)
 *   - Uploads photo to Supabase storage `panini-customs/<userId>/<draftId>.jpg`
 *   - Stores draft metadata (name/country/stats/photoUrl/rarity) in zustand
 *     panini-drafts store so checkout can attach it to the order item.
 *   - Adds SKU to cart at $200.
 *
 * Pablo R4 #3: AI background removal via Replicate is queued — flip
 * REPLICATE_ENABLED once API key is set on the API server. UI ships now
 * without AI; sticker is rendered with raw selfie + Panini frame.
 */
import { useState } from 'react'
import {
  View, Text, TouchableOpacity, ScrollView, TextInput, Image,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'

/* Lazy-load native modules — keeps the screen from crashing on older
 * TestFlight binaries that predate the plugin entries in app.json
 * (Builds 10-12). Try/catch around each call surfaces a friendly
 * "update from TestFlight" Alert instead of a hard exit. */
type ImagePickerModule = typeof import('expo-image-picker')
type ImageManipulatorModule = typeof import('expo-image-manipulator')
let _ImagePicker: ImagePickerModule | null = null
let _ImageManipulator: ImageManipulatorModule | null = null
let _nativeAvailable: boolean | null = null

function loadImageModules(): boolean {
  if (_nativeAvailable !== null) return _nativeAvailable
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _ImagePicker = require('expo-image-picker') as ImagePickerModule
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _ImageManipulator = require('expo-image-manipulator') as ImageManipulatorModule
    _nativeAvailable = true
  } catch {
    _nativeAvailable = false
  }
  return _nativeAvailable
}
import { PaniniCardPreview } from '@/components/PaniniCardPreview'
import { useCartStore } from '@/lib/cart-store'
import { useAuthStore } from '@/lib/auth-store'
import { usePaniniDraftStore } from '@/lib/panini-drafts'
import { uploadPaniniPhoto } from '@/lib/mi-panini-storage'
import { api } from '@/lib/api'
import {
  MI_PANINI_PRICE_MXN, EMPTY_DRAFT, miPaniniSku, newDraftId,
  COUNTRY_OPTIONS, type MiPaniniDraft,
} from '@/lib/mi-panini'
import { STAR_RARITIES, RARITY_DISPLAY, type StarRarity } from '@/lib/pricing'
import { fmt } from '@/lib/data'
import { COLORS, SPACING, RADIUS, FONT, SHADOW } from '@/lib/theme'

type Step = 'card-type' | 'identity' | 'stats' | 'photo' | 'preview'
const STEPS: Step[] = ['card-type', 'identity', 'stats', 'photo', 'preview']
const STEP_LABEL: Record<Step, string> = {
  'card-type': 'Tipo',
  identity:    'Datos',
  stats:       'Stats',
  photo:       'Foto',
  preview:     'Lista',
}

export default function MyPaniniWizard() {
  const [step, setStep] = useState<Step>('card-type')
  // Hydrate from inProgress slot so going back + reopening the wizard restores
  // whatever the user had filled in. Cleared on successful add-to-cart below.
  const inProgress = usePaniniDraftStore((s) => s.inProgress)
  const [draft, setDraftState] = useState<MiPaniniDraft>(inProgress ?? EMPTY_DRAFT)
  const [submitting, setSubmitting] = useState(false)
  const user = useAuthStore((s) => s.user)
  const addToCart = useCartStore((s) => s.add)
  const saveDraft = usePaniniDraftStore((s) => s.save)
  const setInProgress = usePaniniDraftStore((s) => s.setInProgress)

  // Mirror every edit into the inProgress slot so a back-navigate keeps state.
  function setDraft(next: MiPaniniDraft) {
    setDraftState(next)
    setInProgress(next)
  }

  const stepIdx = STEPS.indexOf(step)
  const canNext = isStepValid(step, draft)

  function next() {
    const i = STEPS.indexOf(step)
    if (i < STEPS.length - 1) setStep(STEPS[i + 1]!)
  }
  function back() {
    const i = STEPS.indexOf(step)
    if (i > 0) setStep(STEPS[i - 1]!)
    else router.back()
  }

  async function addAndCheckout() {
    if (!user) {
      Alert.alert('Inicia sesión', 'Necesitas una cuenta para pedir tu cromo personalizado.')
      return
    }
    if (!draft.photoUri) {
      Alert.alert('Photo required', 'Take or pick a photo before checking out.')
      return
    }

    setSubmitting(true)
    try {
      const draftId = newDraftId()
      const sku = miPaniniSku(draftId)

      // Upload photo to Supabase storage so the server can render the
      // printable artwork during fulfillment. If upload fails (network or
      // bucket misconfigured) we still let the order proceed with local
      // photoUri so Pablo can request a re-upload via support.
      let photoPublicUrl: string | undefined
      try {
        const result = await uploadPaniniPhoto(draft.photoUri, user.id, draftId)
        photoPublicUrl = result.publicUrl
      } catch (err) {
        console.warn('[mi-panini] photo upload failed', err)
      }

      const finalDraft: MiPaniniDraft = {
        ...draft,
        ...(photoPublicUrl ? { photoPublicUrl } : {}),
      }
      saveDraft(draftId, finalDraft)

      // Persist the draft row server-side now so we can trigger AI bg-remove
      // before checkout. order_number is filled in later by the MP webhook;
      // we use a placeholder until then since the column is nullable in flow.
      // Soft-fail: any error here just means AI won't run yet — the cart still
      // contains the SKU and checkout will resubmit drafts after MP.
      if (photoPublicUrl) {
        try {
          await api.miPanini.submitDrafts([{
            id: draftId,
            order_number: 'PENDING',
            card_type: finalDraft.cardType,
            player_name: finalDraft.playerName,
            country: finalDraft.country,
            stats: finalDraft.stats,
            photo_public_url: photoPublicUrl,
          }])

          // Kick AI background removal — fire-and-forget. Result is stored on
          // the draft row; the order detail screen picks up ai_processed_url
          // on next refresh.
          api.miPanini.processPhoto(draftId).catch((e) => {
            console.warn('[mi-panini] AI process kick failed', e)
          })
        } catch (e) {
          console.warn('[mi-panini] draft pre-submit failed', e)
        }
      }

      addToCart(sku, 1)
      // Wizard finished cleanly — wipe in-progress slot so next entry starts fresh.
      setInProgress(null)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
      router.replace('/checkout')
    } catch (err) {
      Alert.alert('Could not add to cart', err instanceof Error ? err.message : 'Try again')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={back} style={s.back} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={s.title}>Mi cromo</Text>
          <Text style={s.subtitle}>Paso {stepIdx + 1} de {STEPS.length}: {STEP_LABEL[step]}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Progress bar */}
      <View style={s.progressTrack}>
        <View style={[s.progressFill, { width: `${((stepIdx + 1) / STEPS.length) * 100}%` }]} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          {step === 'card-type' && (
            <CardTypeStep value={draft.cardType} onChange={(cardType) => setDraft({ ...draft, cardType })} />
          )}
          {step === 'identity' && (
            <IdentityStep
              name={draft.playerName}
              country={draft.country}
              onChangeName={(playerName) => setDraft({ ...draft, playerName })}
              onChangeCountry={(country) => setDraft({ ...draft, country })}
            />
          )}
          {step === 'stats' && (
            <StatsStep
              stats={draft.stats}
              onChange={(stats) => setDraft({ ...draft, stats })}
            />
          )}
          {step === 'photo' && (
            <PhotoStep
              photoUri={draft.photoUri}
              onChange={(photoUri) => setDraft({ ...draft, photoUri })}
            />
          )}
          {step === 'preview' && (
            <PreviewStep draft={draft} />
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Sticky CTA */}
      <View style={s.ctaBar}>
        {step === 'preview' ? (
          <TouchableOpacity
            onPress={addAndCheckout}
            disabled={submitting || !canNext}
            style={[s.ctaPrimary, (submitting || !canNext) && s.ctaDisabled]}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color={COLORS.paper} />
            ) : (
              <>
                <Text style={s.ctaPrimaryText}>Agregar y pagar · {fmt(MI_PANINI_PRICE_MXN)}</Text>
                <Ionicons name="arrow-forward" size={16} color={COLORS.paper} />
              </>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={next}
            disabled={!canNext}
            style={[s.ctaPrimary, !canNext && s.ctaDisabled]}
            activeOpacity={0.85}
          >
            <Text style={s.ctaPrimaryText}>Continuar</Text>
            <Ionicons name="arrow-forward" size={16} color={COLORS.paper} />
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  )
}

/* ─── Steps ────────────────────────────────────────────────────────── */

function CardTypeStep({ value, onChange }: { value: StarRarity; onChange: (r: StarRarity) => void }) {
  return (
    <View style={{ gap: SPACING.md }}>
      <Text style={s.h1}>Elige el tipo de tarjeta</Text>
      <Text style={s.body}>El borde define la rareza visual del cromo. Todos cuestan {fmt(MI_PANINI_PRICE_MXN)}.</Text>
      {STAR_RARITIES.map((r) => {
        const d = RARITY_DISPLAY[r]
        const selected = r === value
        return (
          <TouchableOpacity
            key={r}
            onPress={() => onChange(r)}
            activeOpacity={0.85}
            style={[
              s.cardTypeRow,
              { backgroundColor: d.bg, borderColor: selected ? d.color : 'transparent', borderWidth: selected ? 3 : 1 },
            ]}
          >
            <View style={[s.cardTypeSwatch, { backgroundColor: d.color }]} />
            <View style={{ flex: 1 }}>
              <Text style={[s.cardTypeLabel, { color: d.color }]}>{d.label}</Text>
              <Text style={[s.cardTypeSub, { color: d.color }]}>Borde {d.label.toLowerCase()} · acabado especial</Text>
            </View>
            {selected && <Ionicons name="checkmark-circle" size={22} color={d.color} />}
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

function IdentityStep({
  name, country, onChangeName, onChangeCountry,
}: { name: string; country: string; onChangeName: (v: string) => void; onChangeCountry: (v: string) => void }) {
  return (
    <View style={{ gap: SPACING.md }}>
      <Text style={s.h1}>Tu nombre y país</Text>
      <Text style={s.body}>Como aparecerá en el cromo impreso.</Text>

      <Text style={s.label}>Nombre (máx 22 caracteres)</Text>
      <TextInput
        style={s.input}
        value={name}
        onChangeText={(v) => onChangeName(v.slice(0, 22))}
        placeholder="J. PÉREZ"
        autoCapitalize="characters"
        maxLength={22}
      />

      <Text style={s.label}>País</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: SPACING.sm, paddingVertical: 4 }}>
        {COUNTRY_OPTIONS.map((c) => {
          const selected = c.code === country
          return (
            <TouchableOpacity
              key={c.code}
              onPress={() => onChangeCountry(c.code)}
              style={[s.countryChip, selected && s.countryChipActive]}
              activeOpacity={0.85}
            >
              <Text style={{ fontSize: 20 }}>{c.flag}</Text>
              <Text style={[s.countryChipText, selected && s.countryChipTextActive]}>{c.code}</Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    </View>
  )
}

function StatsStep({
  stats, onChange,
}: { stats: MiPaniniDraft['stats']; onChange: (v: MiPaniniDraft['stats']) => void }) {
  const entries: Array<[keyof MiPaniniDraft['stats'], string]> = [
    ['pace',      'Velocidad'],
    ['shooting',  'Tiro'],
    ['passing',   'Pase'],
    ['defending', 'Defensa'],
  ]
  return (
    <View style={{ gap: SPACING.md }}>
      <Text style={s.h1}>Tus stats</Text>
      <Text style={s.body}>Sé honesto. O no. 99 en todo se ve igual de bonito.</Text>
      {entries.map(([key, label]) => (
        <View key={key} style={s.statRow}>
          <Text style={s.statRowLabel}>{label}</Text>
          <View style={s.statRowSlider}>
            <TouchableOpacity onPress={() => onChange({ ...stats, [key]: Math.max(0, stats[key] - 5) })} hitSlop={8}>
              <Ionicons name="remove-circle" size={28} color={COLORS.ink} />
            </TouchableOpacity>
            <Text style={s.statRowValue}>{stats[key]}</Text>
            <TouchableOpacity onPress={() => onChange({ ...stats, [key]: Math.min(99, stats[key] + 5) })} hitSlop={8}>
              <Ionicons name="add-circle" size={28} color={COLORS.green} />
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  )
}

function PhotoStep({
  photoUri, onChange,
}: { photoUri: string | null; onChange: (uri: string | null) => void }) {
  const [busy, setBusy] = useState(false)

  async function pick(fromCamera: boolean) {
    // Gate: older TestFlight binaries lack the native modules entirely.
    if (!loadImageModules() || !_ImagePicker || !_ImageManipulator) {
      Alert.alert(
        'Versión desactualizada',
        'Necesitas la última versión. Actualiza desde TestFlight (Build 13 o superior).',
      )
      return
    }
    const IP = _ImagePicker
    const IM = _ImageManipulator

    setBusy(true)
    try {
      const perm = fromCamera
        ? await IP.requestCameraPermissionsAsync()
        : await IP.requestMediaLibraryPermissionsAsync()
      if (!perm.granted) {
        Alert.alert('Permiso requerido', 'Activa el permiso en Ajustes para continuar.')
        return
      }

      const result = fromCamera
        ? await IP.launchCameraAsync({
            mediaTypes: IP.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.85,
          })
        : await IP.launchImageLibraryAsync({
            mediaTypes: IP.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.85,
          })

      if (result.canceled || !result.assets[0]) return

      // Force-resize down to 1024x1024 JPEG so the upload stays small + the
      // print render gets predictable input. EXIF orientation auto-applied.
      const manipulated = await IM.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 1024, height: 1024 } }],
        { compress: 0.85, format: IM.SaveFormat.JPEG },
      )
      onChange(manipulated.uri)
    } catch (e) {
      Alert.alert(
        'No pudimos tomar la foto',
        `${(e as Error).message ?? 'Error desconocido'}. Actualiza la app desde TestFlight si el problema persiste.`,
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <View style={{ gap: SPACING.md, alignItems: 'center' }}>
      <Text style={s.h1}>Tu foto</Text>
      <Text style={s.body}>Una selfie clara, bien iluminada. Cuadrada.</Text>

      <View style={s.photoPreviewWrap}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={s.photoPreview} resizeMode="cover" />
        ) : (
          <View style={s.photoPlaceholder}>
            <Ionicons name="camera" size={48} color={COLORS.textMuted} />
            <Text style={{ color: COLORS.textMuted, marginTop: 8 }}>Sin foto aún</Text>
          </View>
        )}
      </View>

      <View style={s.photoBtns}>
        <TouchableOpacity onPress={() => pick(true)} disabled={busy} style={[s.photoBtn, s.photoBtnPrimary]} activeOpacity={0.85}>
          <Ionicons name="camera" size={18} color={COLORS.paper} />
          <Text style={s.photoBtnPrimaryText}>Tomar selfie</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => pick(false)} disabled={busy} style={[s.photoBtn, s.photoBtnSecondary]} activeOpacity={0.85}>
          <Ionicons name="images" size={18} color={COLORS.green} />
          <Text style={s.photoBtnSecondaryText}>Elegir de galería</Text>
        </TouchableOpacity>
      </View>

      {busy && <ActivityIndicator color={COLORS.green} />}
    </View>
  )
}

function PreviewStep({ draft }: { draft: MiPaniniDraft }) {
  return (
    <View style={{ alignItems: 'center', gap: SPACING.lg }}>
      <Text style={s.h1}>¿Cómo te ves?</Text>
      <Text style={s.body}>Si todo se ve bien, agrégalo al carrito. Recoges en tienda.</Text>
      <PaniniCardPreview
        cardType={draft.cardType}
        playerName={draft.playerName}
        country={draft.country}
        stats={draft.stats}
        photoUri={draft.photoUri}
        width={260}
      />
      <View style={s.priceBox}>
        <Text style={s.priceLabel}>Precio</Text>
        <Text style={s.priceValue}>{fmt(MI_PANINI_PRICE_MXN)}</Text>
      </View>
    </View>
  )
}

/* ─── Validation ──────────────────────────────────────────────────── */

function isStepValid(step: Step, d: MiPaniniDraft): boolean {
  switch (step) {
    case 'card-type': return STAR_RARITIES.includes(d.cardType)
    case 'identity':  return d.playerName.trim().length > 0 && d.country.length > 0
    case 'stats':     return Object.values(d.stats).every((v) => v >= 0 && v <= 99)
    case 'photo':     return !!d.photoUri
    case 'preview':   return !!d.photoUri && d.playerName.trim().length > 0
  }
}

/* ─── Styles ──────────────────────────────────────────────────────── */

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.cream },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingTop: SPACING.sm },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '900', color: COLORS.ink },
  subtitle: { fontSize: 11, color: COLORS.textMuted, fontWeight: '700', letterSpacing: 1, marginTop: 2 },

  progressTrack: { height: 3, backgroundColor: COLORS.border, marginHorizontal: SPACING.lg, borderRadius: 99, marginTop: SPACING.sm, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.green, borderRadius: 99 },

  scroll: { padding: SPACING.lg, paddingBottom: 120, gap: SPACING.md },

  h1: { fontSize: 24, fontWeight: FONT.weight.black, color: COLORS.ink, letterSpacing: -0.5 },
  body: { fontSize: 14, color: COLORS.textMuted, lineHeight: 20 },
  label: { fontSize: 10, fontWeight: FONT.weight.bold, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1.4, marginTop: SPACING.sm },
  input: {
    backgroundColor: COLORS.paper, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    fontSize: 15, fontWeight: '700', letterSpacing: 1, color: COLORS.ink,
  },

  /* Card type step */
  cardTypeRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    padding: SPACING.md, borderRadius: RADIUS.lg,
  },
  cardTypeSwatch: { width: 36, height: 50, borderRadius: 4 },
  cardTypeLabel: { fontSize: 16, fontWeight: FONT.weight.black, letterSpacing: 1 },
  cardTypeSub: { fontSize: 11, marginTop: 2, opacity: 0.75 },

  /* Country chips */
  countryChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.paper,
    borderWidth: 1, borderColor: COLORS.border,
  },
  countryChipActive: { backgroundColor: COLORS.green, borderColor: COLORS.green },
  countryChipText: { fontSize: 12, fontWeight: '900', color: COLORS.ink, letterSpacing: 1 },
  countryChipTextActive: { color: COLORS.paper },

  /* Stats step */
  statRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.paper, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.md,
  },
  statRowLabel: { fontSize: 15, fontWeight: '800', color: COLORS.ink, flex: 1 },
  statRowSlider: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  statRowValue: { fontSize: 22, fontWeight: '900', color: COLORS.ink, minWidth: 40, textAlign: 'center', fontVariant: ['tabular-nums'] },

  /* Photo step */
  photoPreviewWrap: {
    width: 240, height: 240,
    borderRadius: RADIUS.lg, overflow: 'hidden',
    borderWidth: 2, borderColor: COLORS.gold,
    ...SHADOW.md,
  },
  photoPreview: { width: '100%', height: '100%' },
  photoPlaceholder: { flex: 1, backgroundColor: COLORS.surface2, alignItems: 'center', justifyContent: 'center' },
  photoBtns: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  photoBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 12, borderRadius: RADIUS.full },
  photoBtnPrimary: { backgroundColor: COLORS.green, borderWidth: 2, borderColor: COLORS.gold },
  photoBtnPrimaryText: { color: COLORS.paper, fontWeight: '900', fontSize: 13 },
  photoBtnSecondary: { backgroundColor: COLORS.paper, borderWidth: 1.5, borderColor: COLORS.green },
  photoBtnSecondaryText: { color: COLORS.green, fontWeight: '900', fontSize: 13 },

  /* Preview step */
  priceBox: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  priceLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1.5 },
  priceValue: { fontSize: 28, fontWeight: '900', color: COLORS.ink },

  /* Sticky CTA bar */
  ctaBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.xl,
    backgroundColor: COLORS.paper,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  ctaPrimary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: COLORS.green, borderWidth: 2, borderColor: COLORS.gold,
    borderRadius: RADIUS.full, paddingVertical: 14,
  },
  ctaPrimaryText: { color: COLORS.paper, fontWeight: '900', fontSize: 14 },
  ctaDisabled: { opacity: 0.4 },
})
