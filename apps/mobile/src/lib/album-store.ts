import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { api } from './api'

export type StickerState = { owned: number; needed: number }
export type AlbumState = Record<string, Record<number, StickerState>>

interface AlbumStore {
  album: AlbumState
  timeline: { date: string; owned: number }[]
  syncedAt: number | null
  markOwned: (groupId: string, n: number, delta: number) => void
  markNeeded: (groupId: string, n: number, delta: number) => void
  resetGroup: (groupId: string) => void
  resetAll: () => void
  syncFromServer: () => Promise<void>
  pushLocalToServer: () => Promise<void>
}

/** Fire-and-forget background server sync — keeps UI optimistic */
function syncSticker(groupId: string, n: number, state: StickerState) {
  api.album.upsertSticker({
    group_id: groupId,
    sticker_n: n,
    owned: state.owned,
    needed: state.needed,
  }).catch(() => {})
}

function snapshot(album: AlbumState) {
  let owned = 0
  for (const group of Object.values(album)) {
    for (const s of Object.values(group)) owned += s.owned > 0 ? 1 : 0
  }
  return owned
}

export const useAlbumStore = create<AlbumStore>()(
  persist(
    (set, get) => ({
      album: {},
      timeline: [],
      syncedAt: null,

      markOwned: (groupId, n, delta) => set((state) => {
        const album = { ...state.album }
        album[groupId] = { ...album[groupId] }
        const prev = album[groupId][n] ?? { owned: 0, needed: 0 }
        const next = { ...prev, owned: Math.max(0, prev.owned + delta) }
        album[groupId][n] = next
        syncSticker(groupId, n, next)

        const owned = snapshot(album)
        const timeline = [...state.timeline]
        const today = new Date().toISOString().slice(0, 10)
        const last = timeline[timeline.length - 1]
        if (!last || last.date !== today) {
          timeline.push({ date: today, owned })
          if (timeline.length > 500) timeline.splice(0, 1)
        } else {
          timeline[timeline.length - 1] = { date: today, owned }
        }
        return { album, timeline }
      }),

      markNeeded: (groupId, n, delta) => set((state) => {
        const album = { ...state.album }
        album[groupId] = { ...album[groupId] }
        const prev = album[groupId][n] ?? { owned: 0, needed: 0 }
        const next = { ...prev, needed: Math.max(0, prev.needed + delta) }
        album[groupId][n] = next
        syncSticker(groupId, n, next)
        return { album }
      }),

      resetGroup: (groupId) => set((state) => {
        const album = { ...state.album }
        delete album[groupId]
        return { album }
      }),

      resetAll: () => set({ album: {}, timeline: [] }),

      syncFromServer: async () => {
        try {
          const r = await api.album.fetch()
          if (r.album && Object.keys(r.album).length > 0) {
            set({ album: r.album as AlbumState, syncedAt: Date.now() })
          } else {
            // Server has nothing — push our local state up so this device's
            // existing collection becomes the cloud copy.
            await get().pushLocalToServer()
          }
        } catch { /* offline — keep local */ }
      },

      pushLocalToServer: async () => {
        const album = get().album
        const stickers: Array<{ group_id: string; sticker_n: number; owned: number; needed: number }> = []
        for (const [gid, group] of Object.entries(album)) {
          for (const [n, st] of Object.entries(group)) {
            if ((st.owned ?? 0) > 0 || (st.needed ?? 0) > 0) {
              stickers.push({ group_id: gid, sticker_n: Number(n), owned: st.owned, needed: st.needed })
            }
          }
        }
        if (stickers.length === 0) return
        try {
          await api.album.bulk(stickers)
          set({ syncedAt: Date.now() })
        } catch { /* will retry next session */ }
      },
    }),
    { name: 'pablo-album-v1', storage: createJSONStorage(() => AsyncStorage) },
  ),
)

export function albumStats(album: AlbumState) {
  let owned = 0, needed = 0, extras = 0
  for (const group of Object.values(album)) {
    for (const s of Object.values(group)) {
      if (s.owned > 0) owned++
      if (s.needed > 0) needed++
      if (s.owned > 1) extras += s.owned - 1
    }
  }
  return { owned, needed, extras }
}
