/**
 * Google Places API (New) wrapper — autocomplete + place details.
 * Used by the checkout address form to suggest Mexican addresses as the
 * user types and to split a chosen place into structured fields
 * (street / colonia / city / zip).
 *
 * Endpoints (Places API New, v1):
 *   POST https://places.googleapis.com/v1/places:autocomplete
 *   GET  https://places.googleapis.com/v1/places/{placeId}
 *
 * Billing notes:
 *   - We use the cheap session-based autocomplete tier ($2.83 / 1k sessions).
 *   - Detail requests return only the fields in X-Goog-FieldMask (cheap
 *     tier = addressComponents + formattedAddress + location).
 *
 * Setup:
 *   Set EXPO_PUBLIC_GOOGLE_PLACES_KEY_ANDROID + EXPO_PUBLIC_GOOGLE_PLACES_KEY_IOS
 *   in eas.json. App picks one based on Platform.OS.
 */
import { Platform } from 'react-native'

function apiKey(): string | undefined {
  return Platform.OS === 'ios'
    ? process.env['EXPO_PUBLIC_GOOGLE_PLACES_KEY_IOS']
    : process.env['EXPO_PUBLIC_GOOGLE_PLACES_KEY_ANDROID']
}

export interface PlaceSuggestion {
  placeId: string
  text: string
  secondaryText: string
}

/**
 * Fetch up to ~5 address suggestions for the typed input, restricted to
 * Mexico. Returns empty array if the key is missing, the input is too
 * short, or the API rejects the call.
 */
export async function autocomplete(
  input: string,
  sessionToken?: string,
): Promise<PlaceSuggestion[]> {
  const key = apiKey()
  if (!key || input.trim().length < 3) return []

  try {
    const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat',
      },
      body: JSON.stringify({
        input,
        languageCode: 'es-MX',
        regionCode: 'MX',
        includedRegionCodes: ['mx'],
        sessionToken,
      }),
    })

    if (!res.ok) {
      console.warn('Places autocomplete', res.status, await res.text().catch(() => ''))
      return []
    }

    const data = await res.json() as {
      suggestions?: Array<{
        placePrediction?: {
          placeId: string
          text?: { text: string }
          structuredFormat?: {
            mainText?: { text: string }
            secondaryText?: { text: string }
          }
        }
      }>
    }

    return (data.suggestions ?? [])
      .map((s) => {
        const p = s.placePrediction
        if (!p) return null
        const main = p.structuredFormat?.mainText?.text ?? p.text?.text ?? ''
        const sec = p.structuredFormat?.secondaryText?.text ?? ''
        return { placeId: p.placeId, text: main, secondaryText: sec }
      })
      .filter((s): s is PlaceSuggestion => s !== null)
  } catch (err) {
    console.warn('Places autocomplete error', err)
    return []
  }
}

export interface ParsedAddress {
  street: string         // street name only (no number)
  extNumber: string      // street number
  colonia: string
  municipio: string
  city: string
  zip: string
  state: string
  country: string
  formatted: string
  lat?: number
  lng?: number
}

/**
 * Resolve a placeId into a parsed Mexican address. Maps Google's address
 * components into the fields Pablo's checkout expects.
 */
export async function placeDetails(
  placeId: string,
  sessionToken?: string,
): Promise<ParsedAddress | null> {
  const key = apiKey()
  if (!key) return null

  try {
    const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'id,formattedAddress,addressComponents,location',
        ...(sessionToken ? { 'X-Goog-Session-Token': sessionToken } : {}),
      },
    })

    if (!res.ok) {
      console.warn('Place details', res.status, await res.text().catch(() => ''))
      return null
    }

    const data = await res.json() as {
      formattedAddress?: string
      addressComponents?: Array<{
        types?: string[]
        longText?: string
        shortText?: string
      }>
      location?: { latitude?: number; longitude?: number }
    }

    return parseComponents(data)
  } catch (err) {
    console.warn('Place details error', err)
    return null
  }
}

function parseComponents(d: {
  formattedAddress?: string
  addressComponents?: Array<{ types?: string[]; longText?: string; shortText?: string }>
  location?: { latitude?: number; longitude?: number }
}): ParsedAddress {
  const get = (type: string, kind: 'long' | 'short' = 'long'): string => {
    const c = d.addressComponents?.find((x) => x.types?.includes(type))
    return (kind === 'short' ? c?.shortText : c?.longText) ?? ''
  }

  return {
    street: get('route'),
    extNumber: get('street_number'),
    // In Mexico, "colonia" comes back as sublocality_level_1 or neighborhood
    colonia: get('sublocality_level_1') || get('neighborhood') || get('sublocality'),
    municipio: get('locality') || get('administrative_area_level_2'),
    city: get('locality') || get('administrative_area_level_3') || get('administrative_area_level_2'),
    zip: get('postal_code'),
    state: get('administrative_area_level_1'),
    country: get('country'),
    formatted: d.formattedAddress ?? '',
    ...(d.location?.latitude !== undefined ? { lat: d.location.latitude } : {}),
    ...(d.location?.longitude !== undefined ? { lng: d.location.longitude } : {}),
  }
}

/** UUID v4 — used as Places session token for cost-efficient billing. */
export function newSessionToken(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
