/**
 * AddressForm — Mexican address with Google Places autocomplete.
 *
 * Layout:
 *   [ Search Google Maps...                ]   ← autocomplete input
 *   ▼ suggestions dropdown (when typing)
 *   ─────────────────────────────────────
 *   Street: [Calle Madero            ]
 *   #:      [ 2081 ]   Int: [ ]
 *   Colonia: [ Americana             ]
 *   Municipio / City: [ Guadalajara, Jal. ]
 *   ZIP:    [ 44150 ]
 *   References (optional): [ ... ]
 *
 * Picking a Google suggestion fills the split fields. User can still
 * tweak each field manually before submit.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import {
  autocomplete,
  newSessionToken,
  placeDetails,
  type ParsedAddress,
  type PlaceSuggestion,
} from '@/lib/google-places'
import { COLORS, SPACING, RADIUS, FONT } from '@/lib/theme'

export interface AddressValue {
  street: string
  extNumber: string
  intNumber: string
  colonia: string
  city: string
  zip: string
  references: string
  formatted: string  // single-line for orders.address column
  lat?: number
  lng?: number
}

export function emptyAddress(): AddressValue {
  return {
    street: '', extNumber: '', intNumber: '',
    colonia: '', city: '', zip: '', references: '',
    formatted: '',
  }
}

interface Props {
  value: AddressValue
  onChange: (v: AddressValue) => void
}

export function AddressForm({ value, onChange }: Props) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const session = useRef<string>(newSessionToken())

  // Debounced autocomplete
  useEffect(() => {
    if (query.length < 3) {
      setSuggestions([])
      return
    }
    setLoading(true)
    const t = setTimeout(async () => {
      const res = await autocomplete(query, session.current)
      setSuggestions(res)
      setLoading(false)
    }, 220)
    return () => clearTimeout(t)
  }, [query])

  async function pickSuggestion(s: PlaceSuggestion) {
    setShowSuggestions(false)
    setQuery(`${s.text}, ${s.secondaryText}`)
    const details = await placeDetails(s.placeId, session.current)
    session.current = newSessionToken()  // reset for next address
    if (!details) return
    const merged = applyParsed(value, details)
    onChange(merged)
  }

  function updateField<K extends keyof AddressValue>(k: K, v: AddressValue[K]) {
    const next = { ...value, [k]: v }
    next.formatted = formatSingleLine(next)
    onChange(next)
  }

  const hasGoogleKey = useMemo(() => {
    return !!(process.env['EXPO_PUBLIC_GOOGLE_PLACES_KEY_ANDROID'] || process.env['EXPO_PUBLIC_GOOGLE_PLACES_KEY_IOS'])
  }, [])

  return (
    <View style={s.wrap}>
      {/* Autocomplete search */}
      {hasGoogleKey && (
        <View style={s.searchWrap}>
          <View style={s.searchRow}>
            <Ionicons name="search" size={16} color={COLORS.textMuted} />
            <TextInput
              style={s.searchInput}
              value={query}
              onChangeText={(t) => { setQuery(t); setShowSuggestions(true) }}
              placeholder="Search address (e.g. Lerdo de Tejada 2081)"
              placeholderTextColor={COLORS.textFaint}
              autoCorrect={false}
              onFocus={() => setShowSuggestions(true)}
            />
            {loading && <ActivityIndicator size="small" color={COLORS.green} />}
          </View>
          {showSuggestions && suggestions.length > 0 && (
            <View style={s.dropdown}>
              {suggestions.map((sug) => (
                <TouchableOpacity
                  key={sug.placeId}
                  style={s.suggestion}
                  onPress={() => pickSuggestion(sug)}
                >
                  <Ionicons name="location-outline" size={16} color={COLORS.green} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.suggestionMain} numberOfLines={1}>{sug.text}</Text>
                    <Text style={s.suggestionSub} numberOfLines={1}>{sug.secondaryText}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Split fields */}
      <View style={s.field}>
        <Text style={s.label}>Street</Text>
        <TextInput
          style={s.input}
          value={value.street}
          onChangeText={(v) => updateField('street', v)}
          placeholder="Calle Lerdo de Tejada"
          placeholderTextColor={COLORS.textFaint}
        />
      </View>

      <View style={s.row}>
        <View style={[s.field, { flex: 1 }]}>
          <Text style={s.label}>Number</Text>
          <TextInput
            style={s.input}
            value={value.extNumber}
            onChangeText={(v) => updateField('extNumber', v)}
            placeholder="2081"
            keyboardType="number-pad"
            placeholderTextColor={COLORS.textFaint}
          />
        </View>
        <View style={[s.field, { flex: 1 }]}>
          <Text style={s.label}>Interior (optional)</Text>
          <TextInput
            style={s.input}
            value={value.intNumber}
            onChangeText={(v) => updateField('intNumber', v)}
            placeholder="A"
            placeholderTextColor={COLORS.textFaint}
          />
        </View>
      </View>

      <View style={s.field}>
        <Text style={s.label}>Colonia</Text>
        <TextInput
          style={s.input}
          value={value.colonia}
          onChangeText={(v) => updateField('colonia', v)}
          placeholder="Col. Americana"
          placeholderTextColor={COLORS.textFaint}
        />
      </View>

      <View style={s.row}>
        <View style={[s.field, { flex: 2 }]}>
          <Text style={s.label}>City / Municipio</Text>
          <TextInput
            style={s.input}
            value={value.city}
            onChangeText={(v) => updateField('city', v)}
            placeholder="Guadalajara, Jal."
            placeholderTextColor={COLORS.textFaint}
          />
        </View>
        <View style={[s.field, { flex: 1 }]}>
          <Text style={s.label}>ZIP</Text>
          <TextInput
            style={s.input}
            value={value.zip}
            onChangeText={(v) => updateField('zip', v)}
            placeholder="44150"
            keyboardType="number-pad"
            maxLength={5}
            placeholderTextColor={COLORS.textFaint}
          />
        </View>
      </View>

      <View style={s.field}>
        <Text style={s.label}>References / cross-streets (optional)</Text>
        <TextInput
          style={[s.input, { minHeight: 50 }]}
          value={value.references}
          onChangeText={(v) => updateField('references', v)}
          placeholder="e.g. between Vallarta and Lopez Cotilla, red door"
          placeholderTextColor={COLORS.textFaint}
          multiline
        />
      </View>
    </View>
  )
}

function applyParsed(prev: AddressValue, p: ParsedAddress): AddressValue {
  const merged: AddressValue = {
    street: p.street || prev.street,
    extNumber: p.extNumber || prev.extNumber,
    intNumber: prev.intNumber,
    colonia: p.colonia || prev.colonia,
    city: p.municipio || p.city || prev.city,
    zip: p.zip || prev.zip,
    references: prev.references,
    formatted: '',
    ...(p.lat !== undefined ? { lat: p.lat } : {}),
    ...(p.lng !== undefined ? { lng: p.lng } : {}),
  }
  merged.formatted = formatSingleLine(merged)
  return merged
}

function formatSingleLine(a: AddressValue): string {
  const parts: string[] = []
  if (a.street) {
    const num = [a.extNumber, a.intNumber && `Int. ${a.intNumber}`].filter(Boolean).join(' ')
    parts.push(`${a.street} ${num}`.trim())
  }
  if (a.colonia) parts.push(`Col. ${a.colonia}`)
  if (a.zip || a.city) parts.push([a.zip, a.city].filter(Boolean).join(' '))
  return parts.join(', ')
}

const s = StyleSheet.create({
  wrap: { gap: SPACING.md, marginTop: SPACING.sm },
  searchWrap: { position: 'relative', zIndex: 10 },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.paper,
    borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: COLORS.green,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.ink, padding: 0 },
  dropdown: {
    position: 'absolute', top: 48, left: 0, right: 0,
    backgroundColor: COLORS.paper,
    borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
    overflow: 'hidden',
    zIndex: 20,
  },
  suggestion: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderSoft,
  },
  suggestionMain: { fontSize: 13, fontWeight: '700', color: COLORS.ink },
  suggestionSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },

  field: { gap: 4 },
  row: { flexDirection: 'row', gap: SPACING.sm },
  label: { fontSize: 11, color: COLORS.textMuted, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  input: {
    backgroundColor: COLORS.paper,
    borderRadius: RADIUS.sm,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: COLORS.ink,
  },
})
