import { create } from 'zustand'
import type { AuthUser } from './api'
import { api, clearTokens, setAT, setRT } from './api'
import { useAlbumStore } from './album-store'

interface AuthStore {
  user: AuthUser | null
  hydrated: boolean
  setUser: (u: AuthUser | null) => void
  setHydrated: (b: boolean) => void
  signIn: (email: string, password: string) => Promise<void>
  signUp: (body: { email: string; password: string; username?: string }) => Promise<void>
  signOut: () => Promise<void>
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
    set({ user: r.user })
    useAlbumStore.getState().syncFromServer()
  },

  signUp: async (body) => {
    const r = await api.auth.register(body)
    if ('accessToken' in r) {
      await setAT(r.accessToken)
      await setRT(r.refreshToken)
      set({ user: r.user })
      useAlbumStore.getState().syncFromServer()
    }
  },

  signOut: async () => {
    await api.auth.logout().catch(() => {})
    await clearTokens()
    set({ user: null })
  },

  loadFromToken: async () => {
    try {
      const me = await api.auth.me()
      set({ user: { id: me.id, email: me.email, username: me.username, role: me.role }, hydrated: true })
      useAlbumStore.getState().syncFromServer()
    } catch {
      set({ user: null, hydrated: true })
    }
  },
}))
