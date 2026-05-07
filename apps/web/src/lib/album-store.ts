'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// album[groupId][stickerNum] = { owned, needed }
export type StickerState = { owned: number; needed: number }
export type AlbumState = Record<string, Record<number, StickerState>>

interface AlbumStore {
  album: AlbumState
  timeline: { date: string; owned: number }[]
  markOwned: (groupId: string, n: number, delta: number) => void
  markNeeded: (groupId: string, n: number, delta: number) => void
  resetGroup: (groupId: string) => void
  resetAll: () => void
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

      markOwned: (groupId, n, delta) => set((state) => {
        const album = { ...state.album }
        album[groupId] = { ...album[groupId] }
        const prev = album[groupId][n] ?? { owned: 0, needed: 0 }
        album[groupId][n] = { ...prev, owned: Math.max(0, prev.owned + delta) }

        // snapshot for stats (max 1/day)
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
        album[groupId][n] = { ...prev, needed: Math.max(0, prev.needed + delta) }
        return { album }
      }),

      resetGroup: (groupId) => set((state) => {
        const album = { ...state.album }
        delete album[groupId]
        return { album }
      }),

      resetAll: () => set({ album: {}, timeline: [] }),
    }),
    { name: 'pablo-album-v1' },
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
