/**
 * Apple Sign-In wrapper for Cromos 26.
 *
 * iOS only — Apple Sign-In native module unavailable on Android. Android
 * would need web OAuth via in-app browser; deferring per Pablo's iOS focus.
 *
 * Flow:
 *   1. expo-apple-authentication shows native sheet
 *   2. User authorizes → identityToken returned
 *   3. supabase.auth.signInWithIdToken({ provider: 'apple', token }) → session
 *
 * Requires new EAS build to take effect — native module, not OTA-deliverable.
 */
import * as AppleAuthentication from 'expo-apple-authentication'
import { Platform } from 'react-native'
import { supabase } from './supabase'

export interface AppleSignInResult {
  ok: boolean
  cancelled?: boolean
  error?: string
  accessToken?: string
  refreshToken?: string
}

export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false
  try {
    return await AppleAuthentication.isAvailableAsync()
  } catch {
    return false
  }
}

export async function signInWithApple(): Promise<AppleSignInResult> {
  if (Platform.OS !== 'ios') {
    return { ok: false, error: 'Apple Sign-In is only available on iOS' }
  }

  // Pre-check — if the native module isn't compiled into the running binary
  // (older TestFlight build predates the plugin), signInAsync would throw a
  // confusing platform error. Surface a clear "update your app" message
  // instead. This call is fast (sync-ish) and won't trigger any UI.
  try {
    const available = await AppleAuthentication.isAvailableAsync()
    if (!available) {
      return {
        ok: false,
        error: 'Sign in with Apple no está disponible en esta versión. Actualiza la app desde TestFlight.',
      }
    }
  } catch {
    return {
      ok: false,
      error: 'Esta versión de la app no soporta Sign in with Apple. Actualiza desde TestFlight.',
    }
  }

  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      ],
    })
    if (!credential.identityToken) {
      return { ok: false, error: 'Apple did not return identity token' }
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    })
    if (error || !data.session) {
      return { ok: false, error: error?.message ?? 'Supabase rejected Apple token' }
    }

    return {
      ok: true,
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    }
  } catch (e) {
    const code = (e as { code?: string }).code
    // ERR_CANCELED is the official cancellation error from expo-apple-authentication
    if (code === 'ERR_CANCELED' || code === 'ERR_REQUEST_CANCELED') {
      return { ok: false, cancelled: true }
    }
    return { ok: false, error: (e as Error).message ?? 'Apple sign-in failed' }
  }
}
