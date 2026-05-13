import { create } from 'zustand'
import type { AuthUser } from './api'
import { api, clearTokens, setAT, setRT } from './api'
import { getAT, getCachedUser, setCachedUser } from './auth-storage'
import { useAlbumStore } from './album-store'

interface AuthStore {
  user: AuthUser | null
  hydrated: boolean
  setUser: (u: AuthUser | null) => void
  setHydrated: (b: boolean) => void
  signIn: (email: string, password: string) => Promise<void>
  signUp: (body: { email: string; password: string; username?: string }) => Promise<void>
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

  signOut: async () => {
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
    // 1. Fast path: if we have a cached user and a token, render the app
    //    immediately. Don't wait for the network — Render's free tier
    //    cold-start can take 30-60s and the user would see an infinite spinner.
    const [token, cachedUser] = await Promise.all([getAT(), getCachedUser<AuthUser>()])
    if (token && cachedUser) {
      set({ user: cachedUser, hydrated: true })
      // 2. Refresh in the background — if the token's been revoked or the
      //    user was deleted server-side, drop them.
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

    // 3. No cached state — try the network once, then mark hydrated either way
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
