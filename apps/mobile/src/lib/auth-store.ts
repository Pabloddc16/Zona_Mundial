import { create } from 'zustand'
import type { AuthUser } from './api'
import { api, clearTokens, setAT, setRT } from './api'
import { getAT, getCachedUser, setCachedUser } from './auth-storage'
import { useAlbumStore } from './album-store'
import { signInWithGoogle, signOutGoogle } from './google-auth'
import { signInWithApple } from './apple-auth'
import { supabase } from './supabase'

interface AuthStore {
  user: AuthUser | null
  hydrated: boolean
  setUser: (u: AuthUser | null) => void
  setHydrated: (b: boolean) => void
  signIn: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<{ ok: boolean; cancelled?: boolean; error?: string }>
  signInWithApple: () => Promise<{ ok: boolean; cancelled?: boolean; error?: string }>
  signUp: (body: { email: string; password: string; username?: string; referralCode?: string }) => Promise<void>
  signOut: () => Promise<void>
  deleteAccount: () => Promise<void>
  loadFromToken: () => Promise<void>
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  hydrated: false,
  setUser: (u) => set({ user: u }),
  setHydrated: (b) => set({ hydrated: b }),

  signIn: async (email, password) => {
    const r = await api.auth.login(email, password)
    await setAT(r.accessToken)
    await setRT(r.refreshToken)
    await setCachedUser(r.user)
    set({ user: r.user })
    useAlbumStore.getState().syncFromServer()
  },

  signUp: async (body) => {
    const r = await api.auth.register(body)
    if ('accessToken' in r) {
      await setAT(r.accessToken)
      await setRT(r.refreshToken)
      await setCachedUser(r.user)
      set({ user: r.user })
      useAlbumStore.getState().syncFromServer()
    }
  },

  signInWithGoogle: async () => {
    const result = await signInWithGoogle()
    if (!result.ok || !result.accessToken || !result.refreshToken) {
      const out: { ok: boolean; cancelled?: boolean; error?: string } = { ok: false }
      if (result.cancelled !== undefined) out.cancelled = result.cancelled
      if (result.error !== undefined) out.error = result.error
      return out
    }
    await setAT(result.accessToken)
    await setRT(result.refreshToken)

    // Fetch user profile from API so the rest of the app gets the same shape
    // as email/password sign-in. Supabase ID token has email but not role/username.
    try {
      const me = await api.auth.me()
      const fresh = { id: me.id, email: me.email, username: me.username, role: me.role }
      await setCachedUser(fresh)
      set({ user: fresh })
      useAlbumStore.getState().syncFromServer()
    } catch (e) {
      // Profile fetch failed — likely public.users row missing (first Google sign-in).
      // Use the Supabase user directly so the gate lets them in; profile sync will retry.
      const { data: { user: sbUser } } = await supabase.auth.getUser()
      if (sbUser) {
        const fallback = {
          id: sbUser.id,
          email: sbUser.email ?? '',
          username: sbUser.user_metadata?.['name'] as string ?? sbUser.email?.split('@')[0] ?? 'cromos',
          role: 'customer',
        }
        await setCachedUser(fallback)
        set({ user: fallback })
      }
    }
    return { ok: true }
  },

  signInWithApple: async () => {
    const result = await signInWithApple()
    if (!result.ok || !result.accessToken || !result.refreshToken) {
      const out: { ok: boolean; cancelled?: boolean; error?: string } = { ok: false }
      if (result.cancelled !== undefined) out.cancelled = result.cancelled
      if (result.error !== undefined) out.error = result.error
      return out
    }
    await setAT(result.accessToken)
    await setRT(result.refreshToken)

    try {
      const me = await api.auth.me()
      const fresh = { id: me.id, email: me.email, username: me.username, role: me.role }
      await setCachedUser(fresh)
      set({ user: fresh })
      useAlbumStore.getState().syncFromServer()
    } catch {
      const { data: { user: sbUser } } = await supabase.auth.getUser()
      if (sbUser) {
        const fallback = {
          id: sbUser.id,
          email: sbUser.email ?? '',
          username: sbUser.user_metadata?.['name'] as string ?? sbUser.email?.split('@')[0] ?? 'cromos',
          role: 'customer',
        }
        await setCachedUser(fallback)
        set({ user: fallback })
      }
    }
    return { ok: true }
  },

  signOut: async () => {
    await signOutGoogle().catch(() => {})
    await api.auth.logout().catch(() => {})
    await clearTokens()
    await setCachedUser(null)
    set({ user: null })
  },

  deleteAccount: async () => {
    await api.auth.deleteAccount()
    await clearTokens()
    await setCachedUser(null)
    // Also wipe local album cache so re-signup starts fresh
    useAlbumStore.getState().resetAll()
    set({ user: null })
  },

  loadFromToken: async () => {
    const [token, cachedUser] = await Promise.all([getAT(), getCachedUser<AuthUser>()])

    // 1. No token at all → skip the network entirely. Show login screen
    //    immediately. Render's cold-start (~30-60s) shouldn't block here.
    if (!token) {
      set({ user: null, hydrated: true })
      return
    }

    // 2. Token + cached user → render the app instantly, refresh in background.
    if (cachedUser) {
      set({ user: cachedUser, hydrated: true })
      api.auth.me()
        .then((me) => {
          const fresh = { id: me.id, email: me.email, username: me.username, role: me.role }
          setCachedUser(fresh).catch(() => {})
          set({ user: fresh })
          useAlbumStore.getState().syncFromServer()
        })
        .catch((err) => {
          // Only sign out on explicit auth failure, not network errors
          if (/expired|invalid|unauthorized|401/i.test(String((err as Error).message))) {
            clearTokens(); setCachedUser(null); set({ user: null })
          }
        })
      return
    }

    // 3. Token but no cached user — try /me; mark hydrated either way.
    try {
      const me = await api.auth.me()
      const fresh = { id: me.id, email: me.email, username: me.username, role: me.role }
      await setCachedUser(fresh)
      set({ user: fresh, hydrated: true })
      useAlbumStore.getState().syncFromServer()
    } catch {
      set({ user: null, hydrated: true })
    }
  },
}))
