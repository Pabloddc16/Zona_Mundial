/* =====================================================================
   MUNDIAL 26 — Pure logic (testable, no DOM, no side effects)
   Mirrors the in-app implementations in main.js so unit tests can
   exercise them without booting the UI.
   ===================================================================== */

import { ALBUM, PREFIX_MAP } from './data.js';

export { tierFor, priceForTier } from './data.js';

/* -------- parseCode -------- */
export function parseCode(raw){
  const s = String(raw == null ? "" : raw).toUpperCase().replace(/[^A-Z0-9]/g, "");
  const m = s.match(/^([A-Z]{3})(\d{1,3})$/);
  if(!m) return null;
  const [, prefix, numStr] = m;
  const n = parseInt(numStr, 10);
  const gid = PREFIX_MAP[prefix];
  if(!gid) return null;
  const g = ALBUM.find(x => x.id === gid);
  if(!g) return null;
  const st = g.stickers.find(x => x.n === n);
  if(!st) return null;
  return { gid, n, group: g, sticker: st };
}

/* -------- cartAdd -------- */
// Pure: mutates the passed-in cart object and returns it. Quantities below 1
// are clamped to 1 so the cart never goes negative.
export function cartAdd(cart, id, qty){
  if(cart == null || typeof cart !== "object") throw new TypeError("cart must be an object");
  if(typeof id !== "string" || id.length === 0) throw new TypeError("id must be a non-empty string");
  const q = Number.isFinite(qty) ? Math.max(1, Math.floor(qty)) : 1;
  cart[id] = (cart[id] || 0) + q;
  return cart;
}

/* -------- migrateState --------
 * Mirrors main.js#migrateState. Returns a new object so tests can compare
 * shapes without aliasing the input.
 */
export const DEFAULT_UI = {
  tab: "album",
  albumSub: "todas",
  albumQuery: "",
  albumFilter: "Todos",
  albumCollapsed: {},  // { [gid]: true } — sections the user has folded
  tiendaCat: "all",
  tiendaQ: "",
  payMethod: "card",
  delivery: "pickup",
  editingProfile: false,
  modal: null,
  modalData: {},
};

export const DEFAULT_MYPANINI = {
  step: 1,
  cardType: null,
  country: null,
  countryQuery: "",
  countryOpen: false,
  originalPhoto: null,
  processedPhoto: null,
  bgRemovalLoading: false,
  bgRemovalError: null,
  photoOffsetY: 0,
  fields: { name: "", birthDate: "", heightCm: null, weightKg: null, team: "" },
  uploadError: null,
};

export function migrateState(p){
  const incoming = p && typeof p === "object" ? p : {};
  const merged = Object.assign(
    { screen: "album", params: {}, cart: {}, album: {}, history: [], lastCodes: [] },
    incoming,
    { ui: Object.assign({}, DEFAULT_UI, incoming.ui || {}) }
  );
  if(merged.screen === "home") merged.screen = "album";
  if(merged.ui.tab === "home") merged.ui.tab = "album";
  if(merged.ui.albumSub === "have") merged.ui.albumSub = "todas";
  else if(merged.ui.albumSub === "need") merged.ui.albumSub = "faltantes";
  else if(merged.ui.albumSub === "swap") merged.ui.albumSub = "repetidas";
  if(!merged.myPanini || typeof merged.myPanini.step !== "number"){
    merged.myPanini = JSON.parse(JSON.stringify(DEFAULT_MYPANINI));
  }
  return merged;
}
