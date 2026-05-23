/**
 * Google Sign-In wrapper for Cromos 26.
 *
 * Configure once at app startup, then call signInWithGoogle() from the welcome
 * screen. Returns the Supabase session created via signInWithIdToken.
 *
 * Native module requires a new EAS build to take effect — OTA alone doesn't
 * deliver Java/Swift code. After installing this and bumping app.json, run:
 *   pnpm --filter @pablo/mobile build:android
 *   pnpm --filter @pablo/mobile build:ios
 */
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin'
import { supabase } from './supabase'

const WEB_CLIENT_ID = '101210295525-cfmousid5f72npitf63oqt6p587nhvov.apps.googleusercontent.com'
const IOS_CLIENT_ID = '101210295525-acth5d6aubeg2sqotr8m4l08bk62b4mb.apps.googleusercontent.com'

let _configured = false
function configure() {
  if (_configured) return
  GoogleSignin.configure({
    webClientId: WEB_CLIENT_ID,
    iosClientId: IOS_CLIENT_ID,
    scopes: ['profile', 'email'],
    offlineAccess: false,
  })
  _configured = true
}

export interface GoogleSignInResult {
  ok: boolean
  cancelled?: boolean
  error?: string
  accessToken?: string
  refreshToken?: string
}

export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  configure()
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true })

    // GoogleSignin SDK v16 doesn't expose a nonce parameter, so we can't sign
    // a nonce into Google's ID token. Supabase Auth dashboard must have
    // "Skip nonce checks" enabled for the Google provider — otherwise
    // signInWithIdToken errors with "passed nonce and nonce in id token
    // should either both exist or not".
    const userInfo = await GoogleSignin.signIn()
    const idToken = userInfo.data?.idToken
    if (!idToken) return { ok: false, error: 'Google did not return ID token' }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    })
    if (error || !data.session) return { ok: false, error: error?.message ?? 'Supabase rejected token' }

    return {
      ok: true,
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    }
  } catch (e) {
    const code = (e as { code?: string }).code
    if (code === statusCodes.SIGN_IN_CANCELLED) return { ok: false, cancelled: true }
    if (code === statusCodes.IN_PROGRESS) return { ok: false, error: 'Sign-in already in progress' }
    if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) return { ok: false, error: 'Google Play Services not available' }
    return { ok: false, error: (e as Error).message ?? 'Google sign-in failed' }
  }
}

export async function signOutGoogle(): Promise<void> {
  try {
    configure()
    await GoogleSignin.signOut()
  } catch {
    // ignore — Supabase signOut still works
  }
}
