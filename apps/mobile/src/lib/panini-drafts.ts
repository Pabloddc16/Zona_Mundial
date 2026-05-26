/**
 * Holds per-draft Mi Panini metadata between the wizard and checkout.
 *
 * When the user finishes the wizard:
 *   - draftId generated (8-char base36)
 *   - cart gets SKU `MI-PANINI-<draftId>`
 *   - draft data lives in this store keyed by draftId
 *
 * At checkout, cart resolver pulls name/price for the SKU and the order
 * payload attaches the draft metadata so the server can render the
 * print artwork.
 *
 * Drafts persist across sessions via AsyncStorage in case the user
 * adds the sticker, switches apps, and resumes checkout later.
 */
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { MiPaniniDraft } from './mi-panini'

interface PaniniDraftStore {
  drafts: Record<string, MiPaniniDraft>
  // Single "current wizard draft" slot so navigating back and re-entering the
  // wizard restores progress without abandoning whatever the user already
  // filled in. Cleared on successful add-to-cart.
  inProgress: MiPaniniDraft | null
  save: (id: string, draft: MiPaniniDraft) => void
  get: (id: string) => MiPaniniDraft | undefined
  remove: (id: string) => void
  clear: () => void
  setInProgress: (draft: MiPaniniDraft | null) => void
}

export const usePaniniDraftStore = create<PaniniDraftStore>()(
  persist(
    (set, get) => ({
      drafts: {},
      inProgress: null,
      save: (id, draft) => set((s) => ({ drafts: { ...s.drafts, [id]: draft } })),
      get: (id) => get().drafts[id],
      remove: (id) => set((s) => { const next = { ...s.drafts }; delete next[id]; return { drafts: next } }),
      clear: () => set({ drafts: {}, inProgress: null }),
      setInProgress: (draft) => set({ inProgress: draft }),
    }),
    { name: 'panini-drafts-v1', storage: createJSONStorage(() => AsyncStorage) },
  ),
)
