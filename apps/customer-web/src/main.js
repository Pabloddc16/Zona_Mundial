/* =====================================================================
   MUNDIAL 26 — Panini App (Vanilla JS, sin dependencias)
   ===================================================================== */

import './styles.css';
import { PRODUCTS, CATEGORIES, TEAMS, SPECIALS, PRICE_BY_TIER, ALBUM, TOTAL, PREFIX_MAP } from './data.js';
import { StateSchema, CheckoutPayloadSchema } from './schema.js';
import { initSentry, captureException, handleMutationError } from './sentry.js';
import { isSupabaseConfigured, pushSwap, markSwapApplied, fetchPendingSwaps, subscribeToSwaps } from './supabase.js';
import { encodeOffer as encodeSwapOffer, encodeReceipt as encodeSwapReceipt, decodePayload as decodeSwapPayloadStrict, renderQRSvg } from './swap-qr.js';
import LZString from 'lz-string';

initSentry();

window.addEventListener('error', (event) => {
  const err = event.error || new Error(event.message || 'Unknown window error');
  captureException(err, { tags: { source: 'window.error' } });
});
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
  captureException(reason, { tags: { source: 'unhandledrejection' } });
});

const BRAND = { green:"#006341", red:"#CE1126", gold:"#FFD100", cream:"#FAF6EE", ink:"#0B1F15", paper:"#FFFFFF" };
const fmt = (n) => "$" + Number(n||0).toLocaleString("es-MX", {maximumFractionDigits:0});
const esc = (s) => String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
const pad = (n) => String(n).padStart(2, "0");

/* -------- State + persistence -------- */
const KEY = "mundial26.state.v3";
const defaultState = {
  screen: "album", params: {},
  cart: {}, album: {},
  swapsCount: 0,
  swapPeer: null,        // last scanned peer offer payload (real swap)
  swapReceipt: null,     // pending receipt waiting for peer to scan
  albumTimeline: [],
  user: { name:"Pablo", phone:"+52 55 1234 5678", email:"pablo@mundial26.mx", address:"Av. Chapultepec 100, Lafayette, GDL", city:"GDL", memberSince:"2026-04-01", referralCode:"PABLO26", avatar:"🏆", username:"pablo26",
    pos: { registered:false, name:"", type:"tienda", address:"", phone:"", hours:"", visible:true } },
  orders: [
    { orderNumber:"ORD-2047", date:"2026-04-18", items:[{id:"CAJA-100",qty:1},{id:"ALBUM-HARD",qty:1}], total:2869, status:"DELIVERED", delivery:"pickup" },
    { orderNumber:"ORD-2103", date:"2026-04-22", items:[{id:"SOBRE-1",qty:20}], total:520, status:"IN_ROUTE", delivery:"gdl" },
  ],
  lastCodes: [], // recent quick-add codes
  ui: {
    tab: "album",
    albumSub: "todas",           // todas | faltantes | repetidas
    albumQuery: "",
    albumFilter: "Todos",        // Todos | prefix (MEX, ARG, etc)
    albumCollapsed: {},          // { [gid]: true } — sections the user folded
    tiendaCat: "all", tiendaQ:"",
    payMethod: "card",
    delivery: "pickup",          // pickup | gdl | nacional
    statsRange: "year",          // week | month | year
    editingProfile: false,
    accent: "green",             // green | red | gold
    notifReminders: false,
    language: "es",
    modal: null,                 // modal key
    modalData: {},
  },
  history: [],
  // Local mirror of the referral program. `balance` and `earnings` are the
  // canonical spendable saldo (in MXN, integers); they get topped up by
  // addReferralEarning(...) — either from the webhook-fed `summary.events`
  // or directly — and consumed by useReferralCredit.
  referral: {
    applied: null,
    appliedAt: null,
    welcomeCredit: 0,
    welcomeCreditUsed: false,
    balance: 0,
    totalEarned: 0,
    earnings: [],          // [{ orderId, fromUserId, amount, date }]
    useCredit: true,       // checkout toggle, default ON
    pendingCredit: null,   // { orderNumber, amount } — staged on submit, finalized on paid
    summary: null,
  },
  myPanini: {
    step: 1,
    cardType: null,                // "normal" | "extra"
    country: null,                 // {code, name, flag, group}
    countryQuery: "",
    countryOpen: false,
    originalPhoto: null,           // dataURL
    processedPhoto: null,          // dataURL (post bg-removal o fallback)
    bgRemovalLoading: false,
    bgRemovalError: null,
    bgProgress: 0,                 // 0..1
    bgProgressKey: "",             // current step label
    photoOffsetY: 0,               // -100..100
    fields: { name:"", birthDate:"", heightCm:null, weightKg:null, team:"" },
    uploadError: null,
    backgroundRemoved: false,      // true only when AI bg-removal actually ran successfully
  },
};
const cloneDefaultState = () => JSON.parse(JSON.stringify(defaultState));
function reportStateLoadError(err, context){
  captureException(err, { tags: { mutation: "loadState" }, extra: context });
}
function backupCorruptedState(raw){
  try {
    localStorage.setItem("mundial26.state.corrupted." + Date.now(), raw);
    // Replace the corrupt main key with fresh defaults so subsequent reloads
    // don't repeatedly back up the same payload.
    localStorage.setItem(KEY, JSON.stringify(defaultState));
  } catch(_){}
}
// Existing migration logic — operates on a parsed object, returns a merged state.
function migrateState(p){
  const merged = Object.assign({}, defaultState, p, { ui: Object.assign({}, defaultState.ui, p.ui||{}) });
  // Migrate any stale "home" references (Home tab was removed)
  if(merged.screen === "home") merged.screen = "album";
  if(merged.ui.tab === "home") merged.ui.tab = "album";
  // Migrate old album subtab names → new
  if(merged.ui.albumSub === "have") merged.ui.albumSub = "todas";
  else if(merged.ui.albumSub === "need") merged.ui.albumSub = "faltantes";
  else if(merged.ui.albumSub === "swap") merged.ui.albumSub = "repetidas";
  // Migrate old myPanini shape (pre-wizard) → new wizard shape
  if(!merged.myPanini || typeof merged.myPanini.step !== "number"){
    merged.myPanini = JSON.parse(JSON.stringify(defaultState.myPanini));
  }
  // Hard-reset volatile bg-removal flags on every rehydrate. Even though
  // persist() now strips them before write, users who already wrote
  // `bgRemovalLoading: true` to localStorage in a previous build need a
  // rescue path: refreshing the app should always clear the stuck state.
  if(merged.myPanini){
    merged.myPanini.bgRemovalLoading = false;
    merged.myPanini.bgProgress = 0;
    merged.myPanini.bgProgressKey = "";
    merged.myPanini.bgRemovalError = null;
  }
  return merged;
}
const STATE_CORE_KEYS = ["screen","cart","album","user","orders","ui","myPanini","lastCodes"];
function looksMigratable(p){
  if(!p || typeof p !== "object" || Array.isArray(p)) return false;
  return STATE_CORE_KEYS.some(k => Object.prototype.hasOwnProperty.call(p, k));
}
function loadState(){
  try {
    const raw = localStorage.getItem(KEY);
    if(!raw) return cloneDefaultState();
    let parsed;
    try { parsed = JSON.parse(raw); }
    catch(e){
      reportStateLoadError(e, { stage: "json-parse", rawHead: raw.slice(0, 200) });
      backupCorruptedState(raw);
      return cloneDefaultState();
    }
    // 1. Validate as-is against current schema
    const direct = StateSchema.safeParse(parsed);
    if(direct.success) return migrateState(parsed);
    // 2. Try existing migration (handles v2→v3, v1→v3 shape diffs) only if the
    //    payload structurally resembles a prior state. Random JSON like {"foo":1}
    //    short-circuits to corrupted.
    if(looksMigratable(parsed)){
      const migrated = migrateState(parsed);
      const after = StateSchema.safeParse(migrated);
      if(after.success) return migrated;
      reportStateLoadError(new Error("State invalid after migration"), {
        stage: "post-migration",
        issues: after.error.issues,
      });
    } else {
      reportStateLoadError(new Error("State shape unrecognized"), {
        stage: "pre-migration",
        issues: direct.error.issues,
      });
    }
    backupCorruptedState(raw);
    return cloneDefaultState();
  } catch(err){
    handleMutationError("loadState", err);
    return cloneDefaultState();
  }
}
let S = loadState();
// Volatile MyPanini flags that must NEVER be persisted: they describe an
// in-flight runtime task (bg-removal model fetch + ort inference) that
// only exists for the lifetime of the current page. If we wrote
// `bgRemovalLoading: true` to localStorage and the user refreshed
// mid-load, the rehydrated state would render the spinner forever
// because no actual mpRunBgRemoval is running. Stripped before write.
const MP_VOLATILE_KEYS = ["bgRemovalLoading", "bgProgress", "bgProgressKey", "bgRemovalError"];

function persist(){
  try {
    let payload = S;
    if(S.myPanini){
      const cleanMp = { ...S.myPanini };
      MP_VOLATILE_KEYS.forEach(k => { delete cleanMp[k]; });
      payload = { ...S, myPanini: cleanMp };
    }
    localStorage.setItem(KEY, JSON.stringify(payload));
  } catch(err){ captureException(err, { tags: { mutation: "persist" } }); }
}

/* -------- Navigation -------- */
function navTransition(direction, fn){
  // Instant swap — no slide, no fade, no view-transition. The user explicitly
  // wants zero motion when changing screens.
  fn();
  try { window.scrollTo(0, 0); } catch(e) {}
}
// Catalog filter state is local to the Tienda/Productos screen — clear it
// whenever the user enters a new context, so search and chip selection
// don't bleed across navigations.
function _resetCatalogFiltersIfLeaving(nextScreen){
  const stays = nextScreen === "tienda" || nextScreen === "productos" || nextScreen === "producto";
  if(!stays){ S.ui.tiendaCat = "all"; S.ui.tiendaQ = ""; }
}
function go(screen, params){ _resetCatalogFiltersIfLeaving(screen); S.history.push({screen:S.screen, params:S.params}); S.screen=screen; S.params=params||{}; navTransition("forward", render); }
function back(){ const p=S.history.pop(); if(p){ _resetCatalogFiltersIfLeaving(p.screen); S.screen=p.screen; S.params=p.params; } else { S.screen="album"; } navTransition("back", render); }
function reset(screen, params){ _resetCatalogFiltersIfLeaving(screen); S.history=[]; S.screen=screen; S.params=params||{}; S.ui.tab = TAB_OF[screen] || screen; navTransition("forward", render); }
const TAB_OF = { album:"album", stats:"stats", tienda:"tienda", qr:"qr", perfil:"perfil", settings:"perfil", producto:"tienda", productos:"tienda", carrito:"tienda", checkout:"tienda", "checkout-success":"tienda", "checkout-failure":"tienda", orden:"tienda", scan:"qr", swap:"qr", "swap-receipt":"qr", "mypanini-create":"tienda" };

/* -------- Cart -------- */
function productById(id){
  if(typeof id === "string" && id.indexOf("MY-PANINI") === 0){
    const mpName = (S.myPanini && S.myPanini.fields && S.myPanini.fields.name) || "Tu carta";
    return { id, name: "My Panini · " + mpName, price: 200, category:"mypanini", description:"Tu carta personalizada.", emoji:"👤", gradient:[BRAND.gold, BRAND.green] };
  }
  return PRODUCTS.find(p=>p.id===id);
}
function cartAdd(id, qty){
  try {
    qty = qty||1;
    S.cart[id] = (S.cart[id]||0) + qty;
    const p = productById(id);
    toast((qty>1?qty+" × ":"+1 ") + (p?p.name:id));
    render();
  } catch(err){
    handleMutationError("cartAdd", err);
  }
}
function cartSub(id){ S.cart[id] = Math.max(0, (S.cart[id]||0) - 1); if(S.cart[id]===0) delete S.cart[id]; render(); }
function cartRm(id){ delete S.cart[id]; render(); }
function cartClear(){ S.cart = {}; }
function cartItems(){ return Object.keys(S.cart).map(id => { const p=productById(id); return p?Object.assign({},p,{qty:S.cart[id]}):null; }).filter(Boolean); }
function cartCount(){ return cartItems().reduce((s,i)=>s+i.qty, 0); }
function cartSubtotal(){ return cartItems().reduce((s,i)=>s+i.price*i.qty, 0); }

/* -------- Album ops -------- */
function albumStats(){
  let owned=0, dup=0;
  ALBUM.forEach(g => g.stickers.forEach(s => {
    const st=(S.album[g.id]||{})[s.n]; if(st && st.owned>0) owned++; if(st && st.owned>1) dup += st.owned-1;
  }));
  return {owned, dup, total:TOTAL, missing:TOTAL-owned};
}
function missingBreakdown(){
  let comun=0, media=0, dificil=0, total=0;
  ALBUM.forEach(g => g.stickers.forEach(s => {
    const st=(S.album[g.id]||{})[s.n];
    if(!st || st.owned===0){ if(s.tier==="comun") comun++; else if(s.tier==="media") media++; else dificil++; total += s.price; }
  }));
  return { comun, media, dificil, total, count: comun+media+dificil };
}
function groupStats(g){ let own=0; g.stickers.forEach(s=>{ const st=(S.album[g.id]||{})[s.n]; if(st && st.owned>0) own++; }); return { owned: own, total: g.stickers.length }; }
function specialsStats(){
  let owned=0, total=0;
  ALBUM.filter(g=>g.kind==="special").forEach(g=>g.stickers.forEach(s=>{
    total++;
    const st=(S.album[g.id]||{})[s.n]; if(st && st.owned>0) owned++;
  }));
  return { owned, total };
}
function recordAlbumSnapshot(){
  if(!Array.isArray(S.albumTimeline)) S.albumTimeline = [];
  const owned = albumStats().owned;
  const last = S.albumTimeline[S.albumTimeline.length-1];
  if(last && last.owned === owned) return;
  S.albumTimeline.push({ t: Date.now(), owned });
  if(S.albumTimeline.length > 500) S.albumTimeline.splice(0, S.albumTimeline.length - 500);
}
function statsChartBuckets(range){
  const now = new Date();
  const buckets = [];
  const monthShortES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  // Two ranges only:
  //   • "week" — 7 daily points (last 7 days, today inclusive)
  //   • "year" — 12 monthly points (last 12 months, current month inclusive)
  // The old "month" branch was 30 daily points; it's gone — the new tab
  // labelled "12 MESES" reuses the "year" branch since both showed the
  // same 12-month aggregation.
  if(range === "week"){
    const wd = ["D","L","M","M","J","V","S"];
    for(let i=6; i>=0; i--){
      const d = new Date(now); d.setDate(now.getDate()-i); d.setHours(23,59,59,999);
      buckets.push({ end: d.getTime(), label: wd[d.getDay()] });
    }
  } else {
    for(let i=11; i>=0; i--){
      // End of month (i months ago). Day 0 of month+1 = last day of month.
      const d = new Date(now.getFullYear(), now.getMonth()-i+1, 0, 23, 59, 59, 999);
      buckets.push({ end: d.getTime(), label: monthShortES[d.getMonth()] });
    }
  }
  const tl = Array.isArray(S.albumTimeline) ? S.albumTimeline : [];
  const currentOwned = albumStats().owned;
  buckets.forEach((b, idx) => {
    let v = 0;
    for(let i=tl.length-1; i>=0; i--){ if(tl[i].t <= b.end){ v = tl[i].owned; break; } }
    if(idx === buckets.length - 1) v = currentOwned;
    b.value = v;
  });
  return buckets;
}
function setStatsRange(r){ S.ui.statsRange = r; render(); }

function stickerInc(gid, n){
  try {
    if(!S.album[gid]) S.album[gid] = {};
    const cur = S.album[gid][n] || { owned:0 };
    S.album[gid][n] = { owned: cur.owned + 1, forSwap: cur.forSwap };
    const el = document.querySelector(`[data-stk="${gid}-${n}"] .num`);
    if(el){ el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); }
    recordAlbumSnapshot();
    persist();
    if(!patchAlbumAfterStickerChange(gid, n)) render();
  } catch(err){
    handleMutationError("stickerInc", err);
  }
}
function stickerStep(gid, n, delta){
  try {
    if(!S.album[gid]) S.album[gid] = {};
    const cur = S.album[gid][n] || { owned:0 };
    const next = Math.max(0, (cur.owned||0) + delta);
    if(next<=0){ delete S.album[gid][n]; }
    else { S.album[gid][n] = { owned: next, forSwap: cur.forSwap }; }
    const vEl = document.getElementById("stk-v");
    if(vEl) vEl.textContent = String(next);
    recordAlbumSnapshot();
    persist();
    if(!patchAlbumAfterStickerChange(gid, n)) render();
  } catch(err){
    handleMutationError("stickerStep", err);
  }
}

/* -------- Quick Add by code -------- */
function parseCode(raw){
  try {
    const s = String(raw||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
    const m = s.match(/^([A-Z]{3})(\d{1,3})$/);
    if(!m) return null;
    const [_, prefix, numStr] = m;
    const n = parseInt(numStr, 10);
    const gid = PREFIX_MAP[prefix];
    if(!gid) return null;
    const g = ALBUM.find(x=>x.id===gid);
    if(!g) return null;
    const st = g.stickers.find(x=>x.n===n);
    if(!st) return null;
    return { gid, n, group: g, sticker: st };
  } catch(err){
    handleMutationError("parseCode", err);
    return null;
  }
}
function quickAddSubmit(){
  const input = document.getElementById("qa-input");
  const help = document.getElementById("qa-help");
  const val = input.value.trim();
  const parsed = parseCode(val);
  if(!parsed){
    input.classList.add("err");
    help.classList.add("err");
    help.textContent = "Código no válido. Formato: MEX07, ARG10, LEY09…";
    return;
  }
  stickerInc(parsed.gid, parsed.n);
  S.lastCodes = [parsed.sticker.code, ...S.lastCodes.filter(c=>c!==parsed.sticker.code)].slice(0,6);
  persist();
  toast("+1 " + parsed.sticker.code);
  input.value = "";
  input.classList.remove("err");
  help.classList.remove("err");
  help.textContent = "Ejemplo: MEX07, ARG10, BRA14";
  input.focus();
  // re-render modal chips
  renderQuickAddChips();
}
function renderQuickAddChips(){
  const el = document.getElementById("qa-last");
  if(!el) return;
  el.innerHTML = S.lastCodes.slice(0,6).map(c=>`<button class="chip tap" onclick="reAddCode('${c}')">${esc(c)}</button>`).join("");
}
function reAddCode(code){
  const p = parseCode(code); if(!p) return;
  stickerInc(p.gid, p.n);
  toast("+1 " + code);
}
async function openQAScanner(){
  try {
    const { openStickerScanner } = await import('./scanner.js');
    openStickerScanner((code) => {
      try {
        const parsed = parseCode(code);
        if(!parsed){ toast("Código inválido"); return; }
        stickerInc(parsed.gid, parsed.n);
        S.lastCodes = [parsed.sticker.code, ...S.lastCodes.filter(c => c !== parsed.sticker.code)].slice(0, 6);
        persist();
        toast("+1 " + parsed.sticker.code);
        if(S.ui.modal === "qa") renderQuickAddChips();
      } catch(err){
        handleMutationError("openQAScanner.onResult", err);
      }
    });
  } catch(err){
    handleMutationError("openQAScanner.load", err);
  }
}

/* -------- Orders -------- */
function placeOrder(items, total, delivery){
  try {
    const orderNumber = "ORD-" + (2200 + Math.floor(Math.random()*800));
    S.orders.unshift({
      orderNumber, date: new Date().toISOString().slice(0,10),
      items: items.map(i=>({id:i.id, qty:i.qty, name:i.name, price:i.price})),
      total, status:"CREATED", delivery: delivery||"pickup", address: S.user.address,
    });
    cartClear(); persist(); return orderNumber;
  } catch(err){
    handleMutationError("placeOrder", err);
    return null;
  }
}

/* -------- Toast -------- */
function toast(msg){
  const el = document.getElementById("toast");
  el.textContent = msg; el.classList.add("show");
  clearTimeout(el._t); el._t = setTimeout(()=>el.classList.remove("show"), 1800);
}
function copyText(t){
  try {
    if(navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(t).catch(()=>{}); toast("Copiado"); return; }
  } catch(e){}
  try { const ta=document.createElement("textarea"); ta.value=t; ta.style.position="fixed"; ta.style.opacity="0"; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); toast("Copiado"); } catch(e){ toast("No se pudo copiar"); }
}

/* -------- Long press helper -------- */
function attachLongPress(el, gid, n){
  let t=null, moved=false, startX=0, startY=0;
  const start = (e) => {
    moved = false;
    const pt = e.touches ? e.touches[0] : e;
    startX = pt.clientX; startY = pt.clientY;
    t = setTimeout(()=>{ if(!moved){ openStickerModal(gid, n); if(navigator.vibrate) try{navigator.vibrate(30);}catch(e){} } }, 500);
  };
  const move = (e) => {
    const pt = e.touches ? e.touches[0] : e;
    if(Math.abs(pt.clientX-startX)>6 || Math.abs(pt.clientY-startY)>6){ moved=true; clearTimeout(t); }
  };
  const end = () => clearTimeout(t);
  el.addEventListener("touchstart", start, {passive:true});
  el.addEventListener("touchmove", move, {passive:true});
  el.addEventListener("touchend", end);
  el.addEventListener("mousedown", start);
  el.addEventListener("mousemove", move);
  el.addEventListener("mouseup", end);
  el.addEventListener("mouseleave", end);
}

/* -------- Modals (Quick Add, Sticker Edit, Swap confirm) -------- */
let _modalLastFocus = null;
function openQuickAdd(){ _modalLastFocus = document.activeElement; S.ui.modal="qa"; renderModal(); setTimeout(()=>{ const i=document.getElementById("qa-input"); if(i) i.focus(); }, 100); }
function openStickerModal(gid, n){ _modalLastFocus = document.activeElement; S.ui.modal="sticker"; S.ui.modalData={gid, n}; renderModal(); setTimeout(()=>focusFirstInModal(), 50); }
function closeModal(){
  stopAlbumScanner();
  S.ui.modal=null; S.ui.modalData={}; renderModal();
  if(_modalLastFocus && typeof _modalLastFocus.focus === "function") {
    try { _modalLastFocus.focus(); } catch(e){}
  }
  _modalLastFocus = null;
}
function focusFirstInModal(){
  const sheet = document.querySelector("#modal-root .sheet");
  if(!sheet) return;
  const f = sheet.querySelector("input, button, [tabindex]:not([tabindex='-1'])");
  if(f) try { f.focus(); } catch(e){}
}
function trapFocusInModal(e){
  if(!S.ui.modal) return;
  if(e.key === "Escape"){ e.preventDefault(); closeModal(); return; }
  if(e.key !== "Tab") return;
  const sheet = document.querySelector("#modal-root .sheet");
  if(!sheet) return;
  const focusables = Array.from(sheet.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )).filter(el => el.offsetParent !== null);
  if(focusables.length === 0) return;
  const first = focusables[0], last = focusables[focusables.length-1];
  if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
  else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
}
document.addEventListener("keydown", trapFocusInModal);
function renderModal(){
  const root = document.getElementById("modal-root");
  if(!S.ui.modal){ root.innerHTML=""; return; }
  let inner = "";
  if(S.ui.modal==="qa"){
    inner = `
      <div class="handle" aria-hidden="true"></div>
      <button class="close-x tap" onclick="closeModal()" aria-label="Cerrar">✕</button>
      <h2 id="modal-title">Agregar por código</h2>
      <input id="qa-input" class="qa-input" placeholder="MEX07" aria-label="Código de sticker" aria-describedby="qa-help" autocomplete="off" autocapitalize="characters" autocorrect="off" spellcheck="false" maxlength="6" onkeydown="if(event.key==='Enter'){quickAddSubmit()}" oninput="this.classList.remove('err');document.getElementById('qa-help').classList.remove('err');document.getElementById('qa-help').textContent='Ejemplo: MEX07, ARG10, BRA14'" />
      <div id="qa-help" class="qa-help" aria-live="polite">Ejemplo: MEX07, ARG10, BRA14</div>
      <div id="qa-last" class="qa-last"></div>
      <button class="btn ghost tap" style="margin-top:16px;" onclick="openQAScanner()">📷 Escanear QR</button>
      <button class="btn primary tap" style="margin-top:8px;" onclick="quickAddSubmit()">Agregar +1</button>
    `;
  }
  if(S.ui.modal==="sticker"){
    const { gid, n } = S.ui.modalData;
    const g = ALBUM.find(x=>x.id===gid); const s = g.stickers.find(x=>x.n===n);
    const st = (S.album[gid]||{})[n] || {owned:0};
    inner = `
      <div class="handle" aria-hidden="true"></div>
      <button class="close-x tap" onclick="closeModal()" aria-label="Cerrar">✕</button>
      <h2 id="modal-title" class="sr-only">Editar sticker ${esc(s.code)}</h2>
      <div style="text-align:center; margin-bottom: 2px;">
        <div class="mono" style="font-size:12px; color:var(--text-muted); letter-spacing:1px;">${esc(s.code)}</div>
        <div class="disp" style="font-size:18px; margin-top:4px;">${esc(g.name)} · ${esc(s.label)}</div>
        <div class="label" id="stk-label" style="margin-top:6px;">Cantidad actual</div>
      </div>
      <div class="stepper">
        <button class="tap" onclick="stickerStep('${gid}',${n},-1)" aria-label="Restar uno">−</button>
        <div class="v" id="stk-v" aria-live="polite" aria-atomic="true" aria-labelledby="stk-label">${st.owned||0}</div>
        <button class="tap active" onclick="stickerStep('${gid}',${n},1)" aria-label="Sumar uno">+</button>
      </div>
      <button class="tap" style="margin-top:14px; display:block; width:100%; text-align:center; font-size:13px; color:var(--text-muted);" onclick="closeModal()">Cerrar</button>
    `;
  }
  if(S.ui.modal==="swapConfirm"){
    const { receive, give, otherUser, real } = S.ui.modalData;
    inner = `
      <div class="handle" aria-hidden="true"></div>
      <button class="close-x tap" onclick="closeModal()" aria-label="Cerrar">✕</button>
      <h2 id="modal-title">Confirmar intercambio</h2>
      <div class="label" style="text-align:center; margin-top:10px;">RECIBES (${receive.length})</div>
      <div style="display:flex; flex-wrap:wrap; gap:6px; justify-content:center; margin-top:8px;">
        ${receive.map(c=>`<div class="chip" style="background:var(--green); color:#fff; border-color:transparent;">${esc(c)}</div>`).join("") || '<span style="color:var(--text-muted); font-size:12px;">Nada</span>'}
      </div>
      <div class="label" style="text-align:center; margin-top:14px;">DAS (${give.length})</div>
      <div style="display:flex; flex-wrap:wrap; gap:6px; justify-content:center; margin-top:8px;">
        ${give.map(c=>`<div class="chip" style="background:var(--red); color:#fff; border-color:transparent;">${esc(c)}</div>`).join("") || '<span style="color:var(--text-muted); font-size:12px;">Nada</span>'}
      </div>
      <div style="background:${real?'rgba(0,99,65,0.12)':'rgba(255,209,0,0.2)'}; border-radius:12px; padding:10px 12px; margin-top:16px; font-size:12px; color:var(--text);">
        ${real
          ? `Tu álbum se actualizará al instante. Genera un recibo para que <b>@${esc(otherUser)}</b> escanee y su álbum también se sincronice.`
          : `⚠️ Intercambio manual. Tú y ${esc(otherUser)} deben actualizar sus álbumes después de cambiar las cartas físicamente.`}
      </div>
      <div style="display:flex; gap:8px; margin-top:16px;">
        <button class="btn ghost tap" onclick="closeModal()">Cancelar</button>
        <button class="btn primary tap" onclick="finalizeSwap()">Confirmar</button>
      </div>
    `;
  }
  if(S.ui.modal==="fillAlbum"){
    const br = missingBreakdown();
    inner = `
      <div class="handle" aria-hidden="true"></div>
      <button class="close-x tap" onclick="closeModal()" aria-label="Cerrar">✕</button>
      <h2 id="modal-title">Llenar tu álbum</h2>
      <div style="font-size:13px; color:var(--text-muted); margin-top:4px;">Te faltan <b style="color:var(--text);">${br.count}</b> stickers · Total <b style="color:var(--green);">${fmt(br.total)}</b></div>
      <div class="breakdown" style="margin-top:14px;">
        ${br.comun>0?`<div class="line l-comun"><span class="ico">●</span><span class="lbl">${br.comun} comunes × $5</span><span class="amt">${fmt(br.comun*5)}</span></div>`:``}
        ${br.media>0?`<div class="line l-media"><span class="ico">★</span><span class="lbl">${br.media} medias × $15</span><span class="amt">${fmt(br.media*15)}</span></div>`:``}
        ${br.dificil>0?`<div class="line l-dificil"><span class="ico">◆</span><span class="lbl">${br.dificil} difíciles × $30</span><span class="amt">${fmt(br.dificil*30)}</span></div>`:``}
      </div>
      <div style="display:flex; gap:8px; margin-top:16px;">
        <button class="btn ghost tap" onclick="openFillAlbumPickModal()">Elegir cuáles</button>
        <button class="btn primary tap" onclick="confirmFillAlbum()">Comprar todas (${fmt(br.total)})</button>
      </div>
    `;
  }
  if(S.ui.modal==="fillAlbumPick") inner = renderFillAlbumPickModal();
  if(S.ui.modal==="albumExport") inner = renderAlbumExportModal();
  if(S.ui.modal==="albumImport") inner = renderAlbumImportModal();
  if(S.ui.modal==="albumImportConfirm") inner = renderAlbumImportConfirmModal();
  const _sheetCls = S.ui.modal === "fillAlbumPick" ? "sheet sheet-tall" : "sheet";
  root.innerHTML = `<div class="backdrop" onclick="if(event.target===this) closeModal()"><div class="${_sheetCls}" role="dialog" aria-modal="true" aria-labelledby="modal-title" tabindex="-1">${inner}</div></div>`;
  if(S.ui.modal==="qa") renderQuickAddChips();
  if(S.ui.modal==="albumExport") renderAlbumExportQR();
  if(S.ui.modal==="albumImport" && S.ui.modalData && S.ui.modalData.mode === "scan") startAlbumScanner();
}

/* -------- Swap mock -------- */
const MOCK_FRIEND = {
  username: "carlos_m",
  name: "Carlos M.",
  // what Carlos has as duplicates (offered to trade)
  offers: ["BRA14","ARG07","MEX03","ESP11","FRA05","GER09","ITA02","POR12"],
  // what Carlos needs (could be given from user's dups)
  needs:  ["JPN11","KOR14","SEN03","MAR05","NED08","LEY09","BNC05"],
};
function buildSwapData(){
  // user dups available to give
  const userDups = [];
  ALBUM.forEach(g => g.stickers.forEach(s => {
    const st = (S.album[g.id]||{})[s.n];
    if(st && st.owned > 1) userDups.push(s.code);
  }));
  // receives = what Carlos has that user needs
  const receive = MOCK_FRIEND.offers.filter(c => {
    const p = parseCode(c); if(!p) return false;
    const st = (S.album[p.gid]||{})[p.n];
    return !st || st.owned === 0;
  });
  // gives = user dups that Carlos needs
  const give = userDups.filter(c => MOCK_FRIEND.needs.indexOf(c) >= 0);
  // fallback: if user has no dups, show some dummy options they could give
  return {
    receive: receive.length ? receive : MOCK_FRIEND.offers.slice(0,6),
    give: give.length ? give : (userDups.length ? userDups.slice(0,5) : ["(Sin repetidos)"]),
    otherUser: MOCK_FRIEND.username,
    otherName: MOCK_FRIEND.name,
  };
}

/* =====================================================================
   SCREENS
   ===================================================================== */

const SVG_BAG = '<svg viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>';

const SVG_GEAR = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/><circle cx="12" cy="12" r="3"/></svg>`;

// Compact "26 + trophy" mark for the topBar. Renders cleanly down to ~24px.
const SVG_LOGO_MARK = `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-label="Mundial 26">
  <defs>
    <linearGradient id="lm-gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFE490"/><stop offset="55%" stop-color="#F5C430"/><stop offset="100%" stop-color="#9C701A"/>
    </linearGradient>
    <linearGradient id="lm-cyan" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#5CC8DD"/><stop offset="100%" stop-color="#2FA9C2"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="14" ry="14" fill="url(#lm-cyan)"/>
  <!-- Trophy globe -->
  <ellipse cx="32" cy="20" rx="9" ry="8" fill="url(#lm-gold)"/>
  <!-- Cup body -->
  <path d="M 24,24 C 22,40 24,44 32,49 C 40,44 42,40 40,24 C 39,28 36,30 32,30 C 28,30 25,28 24,24 Z" fill="url(#lm-gold)"/>
  <!-- Stem -->
  <rect x="29" y="48" width="6" height="6" fill="url(#lm-gold)"/>
  <!-- Base -->
  <rect x="22" y="52" width="20" height="6" rx="1" fill="#0F4D2E" stroke="url(#lm-gold)" stroke-width="1"/>
</svg>`;

function topBar(title, showBack, hideCart, opts){
  const cc = cartCount();
  const showSettings = !!(opts && opts.showSettings);
  // Optional custom back action — used by the MyPanini wizard so the header
  // arrow can confirm before discarding progress instead of always firing
  // back() blindly. Falls back to plain back() when not provided.
  const backHandler = (opts && opts.backHandler) ? opts.backHandler : "back()";
  return `<div class="top">
    <div class="left">
      ${showBack ? `<button class="back-btn tap" onclick="${backHandler}" aria-label="Volver">‹</button>`
                 : `<div class="logo"><div class="mark">${SVG_LOGO_MARK}</div><div class="word">MUNDIAL<span>26</span></div></div>`}
      ${title ? `<div class="title-sm">${esc(title)}</div>` : ``}
    </div>
    <div class="right">
      ${showSettings ? `<button class="cart-icon tap" onclick="go('settings')" aria-label="Settings">${SVG_GEAR}</button>` : ``}
      ${hideCart || showSettings ? `` : `<button class="cart-icon tap" onclick="go('carrito')" aria-label="Carrito">
        ${SVG_BAG}${cc>0?`<span class="cart-badge">${cc}</span>`:``}
      </button>`}
    </div>
  </div>`;
}

function bottomNav(){
  const ICONS = {
    stats: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="6" y1="20" x2="6" y2="13"/><line x1="12" y1="20" x2="12" y2="6"/><line x1="18" y1="20" x2="18" y2="10"/></svg>`,
    tienda: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>`,
    album: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2"/><line x1="12" y1="4" x2="12" y2="20"/></svg>`,
    qr: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><line x1="14" y1="14" x2="14" y2="17"/><line x1="17" y1="14" x2="17" y2="14.01"/><line x1="20" y1="14" x2="20" y2="17"/><line x1="14" y1="20" x2="17" y2="20"/><line x1="20" y1="20" x2="20" y2="20.01"/><line x1="17" y1="17" x2="20" y2="17"/></svg>`,
    perfil: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg>`,
  };
  const items = [
    {id:"stats",  label:"Stats"},
    {id:"tienda", label:"Tienda"},
    {id:"album",  label:"Álbum",  center:true},
    {id:"qr",     label:"QR"},
    {id:"perfil", label:"Perfil"},
  ];
  return `<nav class="nav" aria-label="Principal">${items.map(it=>{
    const active = S.ui.tab === it.id;
    const aria = active ? `aria-current="page"` : ``;
    const icon = ICONS[it.id] || "";
    if(it.center){
      return `<button type="button" class="tap center ${active?"active":""}" onclick="reset('${it.id}')" ${aria} aria-label="${esc(it.label)}"><span class="circle">${icon}</span><span>${esc(it.label)}</span></button>`;
    }
    return `<button type="button" class="tap ${active?"active":""}" onclick="reset('${it.id}')" ${aria} aria-label="${esc(it.label)}"><span class="dot">${icon}</span><span>${esc(it.label)}</span></button>`;
  }).join("")}</nav>`;
}

/* ---------- ÁLBUM ---------- */

// 16-bump Panini sticker outline built from circular arcs (the way die-cut
// stickers are actually shaped). Each bump is an arc of a small circle
// whose radius r is computed so the arc passes through two adjacent
// anchors on the trough circle (radius B) and peaks at radius P. This
// gives ROUNDED peaks (constant curvature 1/r — not the high-curvature
// spikes of a sinusoid) with subtle anchor cusps at the troughs, exactly
// the Panini stamp/sticker silhouette.
const SPECIAL_WAVES = 16;
const SPECIAL_PATH = (function buildSpecialPath() {
  const cx = 22, cy = 22;
  const B  = 17.5;            // anchor / trough radius
  const P  = 19.0;            // peak radius — amplitude (P-B)/P ≈ 7.9%
  const N  = SPECIAL_WAVES;
  const alpha = Math.PI / N;
  // Solve for the small-circle radius so its arc passes through both
  // adjacent anchors (at radius B) and through the peak point (radius P).
  const xcL = (P * P - B * B) / (2 * (P - B * Math.cos(alpha)));
  const r   = P - xcL;
  let d = '';
  for (let k = 0; k <= N; k++) {
    const phi = (k * 2 * Math.PI) / N - Math.PI / 2;
    const x = cx + B * Math.cos(phi);
    const y = cy + B * Math.sin(phi);
    if (k === 0) d += `M${x.toFixed(3)},${y.toFixed(3)}`;
    else d += `A${r.toFixed(3)},${r.toFixed(3)} 0 0 1 ${x.toFixed(3)},${y.toFixed(3)}`;
  }
  return d + 'Z';
})();
const CIRCLE_PATH = 'M3,22a19,19 0 1,0 38,0 a19,19 0 1,0 -38,0 Z';

// Sticker-shape SVG. Default: a true circle (country team stickers ≥2).
// opts.special=true → 16-wave outline (FWC sections + sticker #1 of every
// country selection). Both shapes are emitted as a single <path> so the
// existing forswap pulse animation (path:first-child) keeps working.
// fill / textColor are CSS expressions (e.g. "var(--sticker-gray-dark)")
// applied via inline style so the palette stays in CSS tokens.
function scallopedCircleSVG(num, fill, textColor, strike, opts) {
  const special = !!(opts && opts.special);
  const d = special ? SPECIAL_PATH : CIRCLE_PATH;
  const s = String(num);
  // Single font size for every state (special/normal, owned/missing) so
  // numbers read identically across the album. 17 for 1–2 digits,
  // 13 for 3+ digits — values that fit inside both shapes.
  const fontSize = s.length > 2 ? 13 : 17;
  const ty = 22 + fontSize * 0.35;
  const halfW = s.length * fontSize * 0.32 + 1;
  const strikeLine = strike
    ? `<line x1="${(22 - halfW).toFixed(2)}" y1="22" x2="${(22 + halfW).toFixed(2)}" y2="22" style="stroke:${textColor}" stroke-width="1.6" stroke-linecap="round"/>`
    : '';
  return `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><path d="${d}" style="fill:${fill}"/><text x="22" y="${ty}" text-anchor="middle" font-family="-apple-system, SF Pro Display, system-ui, sans-serif" font-weight="900" font-size="${fontSize}" style="fill:${textColor}">${s}</text>${strikeLine}</svg>`;
}

// Frozen set of "missing" sticker IDs (gid-n) for the Faltantes tab. While the
// user is on Faltantes, marking a card as obtained must NOT yank it from the
// list — it stays visible (struck through) so the action can be reverted. The
// list only gets recomputed the next time the user re-enters the tab.
let _faltantesFrozen = null;
function freezeFaltantes(){
  const set = new Set();
  ALBUM.forEach(g => g.stickers.forEach(s => {
    const st = (S.album[g.id]||{})[s.n] || { owned: 0 };
    if (st.owned === 0) set.add(`${g.id}-${s.n}`);
  }));
  _faltantesFrozen = set;
}
function setAlbumSub(sub){
  if(sub === "faltantes") freezeFaltantes();
  else _faltantesFrozen = null;
  S.ui.albumSub = sub;
  render();
}

// Collapsible album sections — each team / special section can be folded.
// State is per-gid in S.ui.albumCollapsed and persists across reloads. We
// patch the DOM directly instead of re-rendering the whole album so the
// scroll position, search input, faltantes snapshot, etc. all stay intact.
function toggleAlbumSection(gid){
  if(!S.ui.albumCollapsed) S.ui.albumCollapsed = {};
  const next = !S.ui.albumCollapsed[gid];
  if(next) S.ui.albumCollapsed[gid] = true;
  else delete S.ui.albumCollapsed[gid];
  persist();
  const sec = document.querySelector(`.alb-section[data-section="${gid}"]`);
  if(sec){
    sec.classList.toggle("collapsed", next);
    const header = sec.querySelector(".alb-section-header");
    if(header) header.setAttribute("aria-expanded", next ? "false" : "true");
  }
}

// Sticker palette — mirrors the CSS tokens defined in :root. Kept here as
// CSS-var expressions (not raw hex) so themes/overrides stay centralized.
const STK = {
  yellowLight: 'var(--sticker-yellow-light)',
  goldDark:    'var(--gold-dark)',
  grayDark:    'var(--sticker-gray-dark)',
  white:       'var(--white)',
};

function stickerCellHTML(g, s){
  const st = (S.album[g.id]||{})[s.n] || { owned: 0 };
  const selected = st.owned > 0;          // selected = user has it (≥1)
  const duplicates = Math.max(0, st.owned - 1);
  const fsw = st.forSwap ? " forswap" : "";
  const dup = duplicates > 0 ? `<div class="dupx">${duplicates}</div>` : "";
  const num = s.n;
  // Sticker #1 of every team section represents the crest/logo, so it gets
  // the same Panini-style dentated treatment as the FWC sections.
  const special = g.kind === "special" || s.n === 1;
  const specialCls = special ? " sticker--special" : "";
  const baseAttrs = `data-stk="${g.id}-${s.n}" data-long="1" data-gid="${g.id}" data-n="${s.n}" onclick="stickerInc('${g.id}',${s.n})" title="${esc(s.code)}" aria-label="${esc(s.code)}"`;

  if (special) {
    // Wave outline survives both states (the SVG path is identical).
    // Unselected → yellow + gold number, no strike. Selected → gray-dark
    // + white number, struck through (matches normal selected treatment).
    const fill      = selected ? STK.grayDark    : STK.yellowLight;
    const textColor = selected ? STK.white       : STK.goldDark;
    return `<div class="circle-stk${specialCls}${selected ? ' owned' + fsw : ''} tap" ${baseAttrs}>
      ${scallopedCircleSVG(num, fill, textColor, selected, { special: true })}
      ${dup}
    </div>`;
  }

  if (selected) {
    return `<div class="circle-stk owned${fsw} tap" ${baseAttrs}>
      ${scallopedCircleSVG(num, STK.grayDark, STK.white, true)}
      ${dup}
    </div>`;
  }
  // Missing-normal uses the SAME SVG renderer as the other states (CSS-var
  // fills make it theme-aware) so the number scales with the cell exactly
  // like owned/special, instead of being a fixed 16px CSS that read smaller.
  return `<div class="circle-stk tap" ${baseAttrs}>
    ${scallopedCircleSVG(num, 'var(--circle-empty-bg)', 'var(--circle-empty-text)', false)}
    ${dup}
  </div>`;
}
function albumContentHTML(sub, q){
  function includeSticker(gid, s) {
    if (sub === "faltantes") {
      if (!_faltantesFrozen || !_faltantesFrozen.has(`${gid}-${s.n}`)) return false;
    }
    if (sub === "repetidas" && ((S.album[gid]||{})[s.n]?.owned || 0) <= 1) return false;
    if (q && s.code.indexOf(q) === -1) return false;
    return true;
  }
  const collapsedMap = (S.ui && S.ui.albumCollapsed) || {};
  const chevronSVG = `<svg class="alb-section-chev" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>`;
  const sectionsHTML = ALBUM.map(g => {
    const filtered = g.stickers.filter(s => includeSticker(g.id, s));
    if (filtered.length === 0) return "";
    const totalInGroup = g.stickers.length;
    const ownedInGroup = g.stickers.filter(s => ((S.album[g.id]||{})[s.n]?.owned || 0) > 0).length;
    const cellsHTML = filtered.map(s => stickerCellHTML(g, s)).join("");
    const collapsed = !!collapsedMap[g.id];
    return `
      <div class="alb-section${collapsed ? ' collapsed' : ''}" data-section="${g.id}">
        <button type="button" class="alb-section-header tap" onclick="toggleAlbumSection('${g.id}')" aria-expanded="${collapsed ? 'false' : 'true'}" aria-controls="grid-${g.id}">
          <div class="alb-section-emoji">${g.emoji}</div>
          <div style="flex:1; min-width:0; text-align:left;">
            <div class="alb-section-title">${esc(g.prefix)} · ${esc(g.name)}</div>
            <div class="alb-section-sub">${esc(g.subtitle)}</div>
          </div>
          <div class="alb-section-count" data-section-count="${g.id}">${ownedInGroup}/${totalInGroup}</div>
          ${chevronSVG}
        </button>
        <div class="circles-grid" id="grid-${g.id}">${cellsHTML}</div>
      </div>
      <div class="alb-section-divider"></div>
    `;
  }).join("");
  let emptyState = "";
  if (!sectionsHTML) {
    if (q) {
      emptyState = `<div class="empty"><div class="em">🔍</div><div class="disp" style="font-size:18px;">Sin resultados para "${esc(q)}"</div><div style="font-size:13px; color:var(--text-muted); margin-top:4px;">Prueba con otro código, por ejemplo MEX07.</div></div>`;
    } else if (sub === "faltantes") {
      emptyState = `<div class="empty"><div class="em">🏆</div><div class="disp" style="font-size:18px;">¡Ya no te faltan stickers!</div><div style="font-size:13px; color:var(--text-muted); margin-top:4px;">Completaste el álbum. Bien hecho.</div></div>`;
    } else if (sub === "repetidas") {
      emptyState = `<div class="empty"><div class="em">🔁</div><div class="disp" style="font-size:18px;">Sin repetidos aún</div><div style="font-size:13px; color:var(--text-muted); margin-top:4px;">Cuando tengas duplicados aparecerán aquí para intercambiar.</div></div>`;
    } else {
      emptyState = `<div class="empty"><div class="em">📭</div><div class="disp" style="font-size:18px;">Álbum vacío</div><div style="font-size:13px; color:var(--text-muted); margin-top:4px;">Abre un sobre y toca el botón <b>+</b> abajo.</div></div>`;
    }
  }
  return sectionsHTML + emptyState;
}

function renderAlbumOnly(){
  // Update only the filtered sections — leave the search input, sticky topbar,
  // tabs, scroll position, and keyboard focus untouched. Re-rendering the whole
  // screen on each keystroke caused a visible "refresh bounce."
  const cont = document.getElementById('alb-content');
  if(!cont){ render(); return; }
  const sub = S.ui.albumSub || "todas";
  const q = (S.ui.albumQuery || "").toUpperCase().replace(/[^A-Z0-9]/g,"");
  cont.innerHTML = albumContentHTML(sub, q);
  // Re-attach long-press handlers on the new sticker cells
  cont.querySelectorAll('[data-long="1"]').forEach(el => {
    attachLongPress(el, el.getAttribute("data-gid"), parseInt(el.getAttribute("data-n"),10));
  });
  _missingPopupRefresh();
}

// Surgical DOM update for a single sticker change. Avoids the full-screen
// render() rebuild that would otherwise tear down the search input, topbar,
// segmented control, scroll position and (importantly) the open sticker modal.
// Returns true on success, false if the caller should fall back to render().
function patchAlbumAfterStickerChange(gid, n){
  if (S.screen !== "album" && S.screen !== "album-group") return false;
  const cont = document.getElementById('alb-content');
  if (!cont) return false;
  const g = ALBUM.find(x => x.id === gid);
  const s = g && g.stickers.find(x => x.n === n);
  if (!g || !s) return false;

  const sub = S.ui.albumSub || "todas";
  const q = (S.ui.albumQuery || "").toUpperCase().replace(/[^A-Z0-9]/g,"");
  const st = (S.album[gid]||{})[n] || { owned: 0 };

  // Visibility under the active filter. "faltantes" uses the frozen snapshot,
  // so newly-owned cells stay visible (struck through) — they don't yank out.
  const passesSub =
    sub === "todas" ? true :
    sub === "faltantes" ? !!(_faltantesFrozen && _faltantesFrozen.has(`${gid}-${n}`)) :
    sub === "repetidas" ? (st.owned > 1) : true;
  const passesQuery = !q || s.code.indexOf(q) !== -1;
  const shouldBeVisible = passesSub && passesQuery;

  const cell = cont.querySelector(`[data-stk="${gid}-${n}"]`);

  // Visibility flips only on "repetidas" (faltantes is frozen, todas always
  // shows). Patch surgically — remove the cell when it should hide, insert
  // it sorted-by-n when it should appear — instead of rebuilding the whole
  // album HTML. Falls back to renderAlbumOnly() only when we'd need to
  // create a brand-new section (rare: first dup in a previously-empty group).
  const visibilityFlipped = (shouldBeVisible && !cell) || (!shouldBeVisible && !!cell);
  if (visibilityFlipped) {
    if (!shouldBeVisible && cell) {
      const grid = cell.parentElement;
      cell.remove();
      if (grid && grid.children.length === 0) {
        const section = grid.closest('.alb-section');
        if (section) section.remove();
      }
    } else if (shouldBeVisible && !cell) {
      const section = cont.querySelector(`.alb-section[data-section="${gid}"]`);
      const grid = section && section.querySelector('.circles-grid');
      if (!grid) {
        // Section doesn't exist — first qualifying sticker for this group
        // under the current filter. Fall back to a single album-content
        // rebuild. Topbar/tabs/search/scroll stay intact.
        renderAlbumOnly();
      } else {
        const tmp = document.createElement('div');
        tmp.innerHTML = stickerCellHTML(g, s).trim();
        const fresh = tmp.firstElementChild;
        if (fresh) {
          // Insert sorted by sticker number to match original layout.
          const peers = grid.querySelectorAll('[data-stk]');
          let placed = false;
          for (const c of peers) {
            const cn = parseInt(c.getAttribute('data-n'), 10);
            if (cn > n) { grid.insertBefore(fresh, c); placed = true; break; }
          }
          if (!placed) grid.appendChild(fresh);
          attachLongPress(fresh, gid, n);
        }
      }
    }
  } else if (cell) {
    const tmp = document.createElement('div');
    tmp.innerHTML = stickerCellHTML(g, s).trim();
    const fresh = tmp.firstElementChild;
    if (fresh){
      cell.replaceWith(fresh);
      attachLongPress(fresh, gid, n);
    }
  }

  // Section header count for the affected group.
  const sectionCountEl = cont.querySelector(`[data-section-count="${gid}"]`);
  if (sectionCountEl) {
    const ownedInGroup = g.stickers.filter(x => ((S.album[gid]||{})[x.n]?.owned || 0) > 0).length;
    sectionCountEl.textContent = `${ownedInGroup}/${g.stickers.length}`;
  }

  // Seg subtab badges (live in the screen body, outside #alb-content).
  let countTodas = 0, countFaltantes = 0, countRepetidas = 0;
  ALBUM.forEach(gg => gg.stickers.forEach(ss => {
    countTodas++;
    const stk = (S.album[gg.id]||{})[ss.n] || { owned: 0 };
    if (stk.owned === 0) countFaltantes++;
    if (stk.owned > 1) countRepetidas++;
  }));
  const segBadges = document.querySelectorAll('.body > .seg .bc');
  if (segBadges.length === 3) {
    segBadges[0].textContent = countTodas;
    segBadges[1].textContent = countFaltantes;
    segBadges[2].textContent = countRepetidas;
  }

  // CTA banner ("Te quedan X cartitas...") — update text in place, or remove
  // if no longer applicable. Respect dismissal state (banner absent when
  // dismissed; we don't resurrect it here).
  const ctaWrap = document.querySelector('.body > .album-cta-wrap');
  if (ctaWrap){
    const br = missingBreakdown();
    if (br.count === 0){
      ctaWrap.remove();
    } else {
      const titleEl = ctaWrap.querySelector('.album-cta-title');
      const subEl = ctaWrap.querySelector('.album-cta-sub');
      const btn = ctaWrap.querySelector('.album-cta');
      if (titleEl) titleEl.innerHTML = `Te quedan <b>${br.count}</b> cartitas para completar tu álbum`;
      if (subEl) subEl.innerHTML = `Con <b>${fmt(br.total)}</b> lo completas`;
      if (btn) btn.setAttribute('aria-label', `Pedir las ${br.count} cartitas faltantes`);
    }
  }

  return true;
}

const POPUP_COOLDOWN_MS = 30000;
const POPUP_LS_KEY = 'mundial26.missingPopup.lastClosed';

// Reusable yellow "Pídelas ahora" banner. Used by Album (with close-X that
// hides 30s, per product direction) and Tienda (always-on while there are
// missing stickers — no close).
function missingStickersBannerHTML(opts){
  const o = opts || {};
  const br = missingBreakdown();
  if(br.count === 0) return "";
  if(o.dismissable && _albumCtaHidden) return "";
  // Tienda variant: column layout that mirrors MyPanini's footprint
  // (text+art row on top, full-width CTA below). Album variants keep the
  // original compact one-row look so the dismissable banner doesn't shift.
  if(o.shop){
    return `
      <div class="album-cta-wrap album-cta-wrap--shop">
        <button class="album-cta tap" onclick="openFillAlbumModal()" aria-label="Pedir las ${br.count} cartitas faltantes">
          <div class="album-cta-row">
            <div class="album-cta-text">
              <div class="album-cta-title">Te quedan <b>${br.count}</b> cartitas para completar tu álbum</div>
              <div class="album-cta-sub">Con <b>${fmt(br.total)}</b> lo completas</div>
            </div>
            <span class="album-cta-art" aria-hidden="true">
              <span class="card-tile c1"></span>
              <span class="card-tile c2"></span>
              <span class="card-tile c3"></span>
            </span>
          </div>
          <span class="album-cta-btn">Pídelas ahora</span>
        </button>
      </div>
    `;
  }
  return `
    <div class="album-cta-wrap">
      <button class="album-cta tap" onclick="openFillAlbumModal()" aria-label="Pedir las ${br.count} cartitas faltantes">
        <div class="album-cta-text">
          <div class="album-cta-title">Te quedan <b>${br.count}</b> cartitas para completar tu álbum</div>
          <div class="album-cta-sub">Con <b>${fmt(br.total)}</b> lo completas</div>
        </div>
        <span class="album-cta-btn">Pídelas ahora</span>
      </button>
      ${o.dismissable ? `<button class="album-cta-close tap" onclick="dismissAlbumCta(event)" aria-label="Cerrar aviso">✕</button>` : ``}
    </div>
  `;
}

// Recurrent bottom-sheet popup, only on the Album. Shows when a team
// section enters viewport >70% and then leaves, respecting cooldown.
let _missingPopupObserver = null;
let _missingPopupEl = null;
let _missingPopupVisible = false;
function _missingPopupCanShow(){
  if(S.screen !== 'album' && S.screen !== 'album-group') return false;
  if(_missingPopupVisible) return false;
  if(S.ui.modal) return false;
  if(missingBreakdown().count === 0) return false;
  let last = 0;
  try { last = parseInt(localStorage.getItem(POPUP_LS_KEY) || '0', 10) || 0; } catch(_){}
  return (Date.now() - last) >= POPUP_COOLDOWN_MS;
}
function _missingPopupShow(){
  const br = missingBreakdown();
  if(br.count === 0) return;
  if(!_missingPopupEl){
    _missingPopupEl = document.createElement('div');
    _missingPopupEl.className = 'miss-popup';
    _missingPopupEl.setAttribute('role','dialog');
    _missingPopupEl.setAttribute('aria-label','Cartitas faltantes');
    document.body.appendChild(_missingPopupEl);
  }
  _missingPopupEl.innerHTML = `
    <div class="album-cta-wrap miss-popup-inner">
      <button class="album-cta tap" onclick="missingPopupCta()" aria-label="Pedir las ${br.count} cartitas faltantes">
        <div class="album-cta-text">
          <div class="album-cta-title">Te quedan <b>${br.count}</b> cartitas para completar tu álbum</div>
          <div class="album-cta-sub">Con <b>${fmt(br.total)}</b> lo completas</div>
        </div>
        <span class="album-cta-btn">Pídelas ahora</span>
      </button>
      <button class="album-cta-close tap" onclick="missingPopupClose()" aria-label="Cerrar aviso">✕</button>
    </div>
  `;
  // Force reflow so the .show transition runs from the off-screen state.
  void _missingPopupEl.offsetWidth;
  _missingPopupEl.classList.add('show');
  _missingPopupVisible = true;
}
function missingPopupClose(){
  if(!_missingPopupEl) return;
  try { localStorage.setItem(POPUP_LS_KEY, String(Date.now())); } catch(_){}
  _missingPopupEl.classList.remove('show');
  _missingPopupVisible = false;
  const el = _missingPopupEl;
  setTimeout(() => { if(el && el.parentNode && !_missingPopupVisible) el.remove(); if(_missingPopupEl === el) _missingPopupEl = null; }, 280);
}
function missingPopupCta(){
  // Treat tap-through as dismiss for cooldown purposes — user engaged.
  missingPopupClose();
  openFillAlbumModal();
}
function _missingPopupTeardown(){
  if(_missingPopupObserver){ _missingPopupObserver.disconnect(); _missingPopupObserver = null; }
  if(_missingPopupEl){ _missingPopupEl.remove(); _missingPopupEl = null; }
  _missingPopupVisible = false;
}
function _missingPopupOnIntersection(entries){
  for(const e of entries){
    if(e.isIntersecting && e.intersectionRatio >= 0.7){
      e.target.dataset.popupSeen = '1';
    } else if(!e.isIntersecting && e.target.dataset.popupSeen === '1'){
      e.target.dataset.popupSeen = '';
      if(_missingPopupCanShow()) _missingPopupShow();
    }
  }
}
function _missingPopupRefresh(){
  if(S.screen !== 'album' && S.screen !== 'album-group'){
    _missingPopupTeardown();
    return;
  }
  if(typeof IntersectionObserver === 'undefined') return;
  if(!_missingPopupObserver){
    _missingPopupObserver = new IntersectionObserver(_missingPopupOnIntersection, { threshold: [0, 0.7] });
  } else {
    _missingPopupObserver.disconnect();
  }
  document.querySelectorAll('#alb-content .alb-section').forEach(sec => {
    sec.dataset.popupSeen = '';
    _missingPopupObserver.observe(sec);
  });
}

function screenAlbum(){
  const sub = S.ui.albumSub || "todas";
  const q = (S.ui.albumQuery || "").toUpperCase().replace(/[^A-Z0-9]/g,"");

  // (Re)freeze the Faltantes list when entering the tab fresh — e.g. landing
  // on the album from the bottom nav, or via reset('album'). Tapping a card or
  // typing in search keeps the existing snapshot.
  if (sub === "faltantes" && _faltantesFrozen === null) freezeFaltantes();
  if (sub !== "faltantes" && _faltantesFrozen !== null) _faltantesFrozen = null;

  // Count totals (independent of filters — for subtab badges)
  let countTodas = 0, countFaltantes = 0, countRepetidas = 0;
  ALBUM.forEach(g => g.stickers.forEach(s => {
    countTodas++;
    const st = (S.album[g.id]||{})[s.n] || { owned: 0 };
    if (st.owned === 0) countFaltantes++;
    if (st.owned > 1) countRepetidas++;
  }));

  return `
    ${topBar("Álbum del Mundial", false, true, { showSettings: true })}
    <div class="body">
      ${referralBanner()}
      <div class="seg" style="margin-top: 12px;">
        <button class="tap ${sub==='todas'?'active':''}" onclick="setAlbumSub('todas')">Todas <span class="bc">${countTodas}</span></button>
        <button class="tap ${sub==='faltantes'?'active':''}" onclick="setAlbumSub('faltantes')">Faltantes <span class="bc">${countFaltantes}</span></button>
        <button class="tap ${sub==='repetidas'?'active':''}" onclick="setAlbumSub('repetidas')">Repetidas <span class="bc">${countRepetidas}</span></button>
      </div>

      <div class="alb-search" style="padding: 10px 14px 0;">
        <div class="search" style="margin: 0;">
          <span>🔍</span>
          <input type="text" placeholder="Buscar código: MEX07, ARG10…" value="${esc(S.ui.albumQuery||'')}" oninput="S.ui.albumQuery=this.value;renderAlbumOnly()" autocomplete="off" autocapitalize="characters" spellcheck="false" />
          ${S.ui.albumQuery ? `<button class="tap" style="color:var(--text-faint); font-size:16px; padding:0 4px;" onclick="S.ui.albumQuery='';render()">✕</button>` : ``}
        </div>
      </div>

      ${missingStickersBannerHTML({ dismissable: true })}

      <div id="alb-content">${albumContentHTML(sub, q)}</div>
      <div style="height: 80px;"></div>
    </div>
    <button class="fab tap" onclick="openQuickAdd()" aria-label="Agregar por código">+</button>
    ${bottomNav()}`;
}

/* ---------- STATS ---------- */
function shareStats(){
  const st = albumStats();
  const pct = st.total ? Math.round(st.owned/st.total*100) : 0;
  copyText(`Mi álbum Mundial 26: ${pct}% completo (${st.owned}/${st.total}) 🏆`);
}
function statsChartSVG(range){
  const buckets = statsChartBuckets(range);
  const W = 320, H = 150, P_X = 14, P_TOP = 10, P_BOT = 22;
  const innerW = W - P_X*2;
  const innerH = H - P_TOP - P_BOT;
  const max = Math.max(...buckets.map(b=>b.value), 1);
  const xAt = i => P_X + (buckets.length<=1 ? innerW/2 : innerW * i / (buckets.length - 1));
  const yAt = v => P_TOP + innerH - (innerH * v / max);
  const lineCmds = buckets.map((p, i) => `${i===0?"M":"L"} ${xAt(i).toFixed(1)} ${yAt(p.value).toFixed(1)}`).join(" ");
  const areaCmds = `${lineCmds} L ${xAt(buckets.length-1).toFixed(1)} ${(P_TOP+innerH).toFixed(1)} L ${xAt(0).toFixed(1)} ${(P_TOP+innerH).toFixed(1)} Z`;
  const grid = [0,1,2,3].map(i => {
    const y = (P_TOP + (innerH * i / 3)).toFixed(1);
    return `<line x1="${P_X}" x2="${W-P_X}" y1="${y}" y2="${y}" stroke="var(--border-soft)" stroke-width="1" />`;
  }).join("");
  const dots = buckets.map((p, i) => `<circle cx="${xAt(i).toFixed(1)}" cy="${yAt(p.value).toFixed(1)}" r="3" fill="var(--green)" />`).join("");
  // 12 monthly labels at "Ene…Dic" need a tighter font size than the 7
  // single-letter weekday labels — otherwise 3-letter abbreviations touch.
  const labelFs = buckets.length > 7 ? 9 : 10;
  const labels = buckets.map((p, i) => p.label ? `<text x="${xAt(i).toFixed(1)}" y="${(H-6).toFixed(1)}" text-anchor="middle" font-size="${labelFs}" fill="var(--text-muted)" font-weight="700">${p.label}</text>` : "").join("");
  return `<svg viewBox="0 0 ${W} ${H}" class="prog-svg" role="img" aria-label="Progreso del álbum">
    ${grid}
    <path d="${areaCmds}" fill="rgba(0,99,65,0.10)" />
    <path d="${lineCmds}" stroke="var(--green)" stroke-width="2.5" fill="none" stroke-linejoin="round" stroke-linecap="round"/>
    ${dots}
    ${labels}
  </svg>`;
}
function screenStats(){
  const st = albumStats();
  const pct = st.total ? Math.round(st.owned/st.total*100) : 0;
  const sp = specialsStats();
  const swaps = S.swapsCount || 0;
  // "month" (the old 30-day daily view) collapses into "year" (12 monthly
  // points) since the spec asked for 12 points only. Saved state with
  // `statsRange:"month"` from older sessions silently coerces here.
  const range = (S.ui.statsRange === "week") ? "week" : "year";
  const r = 16, c = 2 * Math.PI * r;
  const dash = (c * pct / 100).toFixed(2);

  return `
    ${topBar("", false, true, { showSettings: true })}
    <div class="body">
      <div class="stats-head">
        <h1 class="stats-title">Stats</h1>
        <button class="stats-share tap" onclick="shareStats()" aria-label="Compartir progreso">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="12" y1="19" x2="12" y2="5"></line>
            <polyline points="6 11 12 5 18 11"></polyline>
          </svg>
        </button>
      </div>

      <div class="stats-section-label">OVERVIEW</div>
      <div class="ov-card">
        <div class="ov-cell">
          <div class="ov-icon ov-ring" aria-hidden="true">
            <svg viewBox="0 0 40 40" width="40" height="40">
              <circle cx="20" cy="20" r="${r}" fill="none" stroke="var(--border-soft)" stroke-width="3.5"></circle>
              <circle cx="20" cy="20" r="${r}" fill="none" stroke="var(--green)" stroke-width="3.5" stroke-dasharray="${dash} ${(c).toFixed(2)}" stroke-dashoffset="0" transform="rotate(-90 20 20)" stroke-linecap="round"></circle>
            </svg>
          </div>
          <div class="ov-text"><div class="lbl">COMPLETED</div><div class="val">${pct}%</div></div>
        </div>
        <div class="ov-cell">
          <div class="ov-icon ov-grid" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"></rect>
              <line x1="3" y1="9" x2="21" y2="9"></line>
              <line x1="3" y1="15" x2="21" y2="15"></line>
              <line x1="9" y1="3" x2="9" y2="21"></line>
              <line x1="15" y1="3" x2="15" y2="21"></line>
            </svg>
          </div>
          <div class="ov-text"><div class="lbl">TOTAL</div><div class="val">${st.total}</div></div>
        </div>
        <div class="ov-cell">
          <div class="ov-icon ov-x" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
              <line x1="6" y1="6" x2="18" y2="18"></line>
              <line x1="18" y1="6" x2="6" y2="18"></line>
            </svg>
          </div>
          <div class="ov-text"><div class="lbl">MISSING</div><div class="val">${st.missing}</div></div>
        </div>
        <div class="ov-cell">
          <div class="ov-icon ov-check" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="5 12.5 10 17.5 19 7.5"></polyline>
            </svg>
          </div>
          <div class="ov-text"><div class="lbl">COLLECTED</div><div class="val">${st.owned}</div></div>
        </div>
        <div class="ov-cell">
          <div class="ov-icon ov-swap" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 4 20 10 14 10"></polyline>
              <polyline points="4 20 4 14 10 14"></polyline>
              <path d="M19.4 9A8 8 0 0 0 5.6 6.4"></path>
              <path d="M4.6 15A8 8 0 0 0 18.4 17.6"></path>
            </svg>
          </div>
          <div class="ov-text"><div class="lbl">SWAPS</div><div class="val">${swaps}</div></div>
        </div>
        <div class="ov-cell">
          <div class="ov-icon ov-special" aria-hidden="true">🏅</div>
          <div class="ov-text"><div class="lbl">SPECIALS</div><div class="val">${sp.owned}/${sp.total}</div></div>
        </div>
      </div>

      <div class="stats-section-label">PROGRESS</div>
      <div class="progress-card">
        <div class="seg-toggle" role="tablist" aria-label="Rango de progreso">
          <button class="seg tap ${range==="week"?"active":""}" role="tab" aria-selected="${range==="week"}" onclick="setStatsRange('week')">WEEK</button>
          <button class="seg tap ${range==="year"?"active":""}" role="tab" aria-selected="${range==="year"}" onclick="setStatsRange('year')">12 MESES</button>
        </div>
        ${statsChartSVG(range)}
      </div>

      <div class="stats-section-label">POR EQUIPO</div>
      <div class="section-list">
        ${ALBUM.map(g => {
          const gs = groupStats(g);
          const p = Math.round(gs.owned/gs.total*100);
          const done = gs.owned===gs.total;
          return `<div class="section-row ${done?"done":""}">
            <div class="em">${g.emoji}</div>
            <div class="body">
              <div class="n">${esc(g.name)}</div>
              <div class="c">${gs.owned}/${gs.total} · ${p}%</div>
              <div class="minibar"><div style="width:${p}%;"></div></div>
            </div>
            ${done?`<div class="tick">✓</div>`:``}
          </div>`;
        }).join("")}
      </div>

      <div style="height:18px;"></div>
    </div>
    ${bottomNav()}`;
}

/* ---------- TIENDA ---------- */
function screenTienda(){
  const br = missingBreakdown();
  const stats = albumStats();
  const pctOwn = stats.total > 0 ? Math.round((stats.owned / stats.total) * 100) : 0;
  // The carousel always shows the full curated list — its job is "what's
  // on offer," not search results. Filtering happens in the embedded
  // catalog below.
  const carouselList = PRODUCTS.slice(0, 8);

  return `
    ${topBar("Tienda", false)}
    <div class="body">
      <div class="shop-section-title">MYPANINI — TU CARTA OFICIAL FIFA</div>
      <div class="mypanini-card">
        <div class="mp-head">
          <div class="em">📸</div>
          <div class="badge-fifa">OFICIAL FIFA</div>
        </div>
        <div class="mp-body">
          <div class="mp-text">
            <h3>MyPanini</h3>
            <div class="sub">Sube tu foto, elige país y tipo. Tu cara en una cartita oficial Panini, lista en tu próximo pedido.</div>
            <div class="price">$200</div>
          </div>
          <img class="mp-hero" src="/images/productos/mypanini-hero.webp" alt="Cartitas MyPanini personalizadas oficiales Panini" loading="lazy" decoding="async" />
        </div>
        <button class="btn tap" onclick="go('mypanini-create')">Crear mi MyPanini →</button>
      </div>

      ${missingStickersBannerHTML({ shop: true })}

      <div class="shop-section-title with-action">
        <span>PRODUCTOS MUNDIAL</span>
        <button class="more-link tap" onclick="scrollToProductCatalog()" aria-label="Ver todos los productos">Ver más →</button>
      </div>
      <div class="prods-rail" role="list">
        ${carouselList.map(p => productCardHTML(p)).join("")}
      </div>

      ${productCatalogHTML()}
    </div>
    ${bottomNav()}`;
}
// Shared search + filter chips + 2-col product grid. Used in both Tienda
// (embedded under the carousel) and Productos (full screen for deep-links).
function productCatalogHTML(){
  let list = PRODUCTS.slice();
  if(S.ui.tiendaCat !== "all") list = list.filter(p => p.category === S.ui.tiendaCat);
  if(S.ui.tiendaQ) list = list.filter(p => p.name.toLowerCase().includes(S.ui.tiendaQ.toLowerCase()));
  return `
    <div id="tienda-catalog" class="product-catalog">
      <div class="search">
        <svg class="lupa" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input type="text" placeholder="Buscar jerseys, sobres, balones..." value="${esc(S.ui.tiendaQ)}" oninput="S.ui.tiendaQ=this.value;renderSearchOnly()" />
      </div>
      <div class="chip-row shop-chips">
        ${CATEGORIES.map(c => `<button class="chip tap ${S.ui.tiendaCat===c.id?"active":""}" onclick="S.ui.tiendaCat='${c.id}';render()">${esc(c.label)}</button>`).join("")}
      </div>
      <div class="prods">
        ${list.map(p => productCardHTML(p)).join("")}
        ${list.length===0?`<div style="grid-column:1/-1; text-align:center; padding:30px 0; color:var(--text-muted); font-size:13px;">Sin resultados.</div>`:``}
      </div>
    </div>
  `;
}
function scrollToProductCatalog(){
  const el = document.getElementById('tienda-catalog');
  if(el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function productCardHTML(p){
  const hasImage = !!p.image;
  // Catalog look: white photo slot for every product, regardless of brand
  // gradient. Keeps focus on the product itself, like Rappi/Panini listings.
  const bg = `background:#FFFFFF;`;
  return `<div class="pcard" role="listitem">
    <button type="button" class="pcard-link tap" aria-label="Ver ${esc(p.name)}" onclick="go('producto',{id:'${p.id}'})">
      <div class="img${hasImage?' has-photo':''}" style="${bg}">
        ${p.badge?`<div class="bd">${esc(p.badge)}</div>`:``}
        ${hasImage
          ? `<img src="${esc(p.image)}" alt="${esc(p.name)}" class="pimg" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'emoji',ariaHidden:'true',textContent:'${esc(p.emoji)}'}))" />`
          : `<span class="emoji" aria-hidden="true">${p.emoji}</span>`}
      </div>
      <div class="pbody">
        <div class="n">${esc(p.name)}</div>
        <div class="foot">
          <div class="price">${fmt(p.price)}</div>
        </div>
      </div>
    </button>
    <button type="button" class="addbtn tap" aria-label="Agregar ${esc(p.name)} al carrito" onclick="cartAdd('${p.id}')">+</button>
  </div>`;
}
function screenProductos(){
  return `
    ${topBar("Productos oficiales", true)}
    <div class="body">
      ${productCatalogHTML()}
    </div>
    ${bottomNav()}`;
}
function renderSearchOnly(){
  // Update only the embedded catalog grid — leave the search input, sticky
  // topbar, hero, carousel, and category chips untouched. Re-rendering the
  // whole screen on each keystroke caused a visible "refresh bounce." The
  // Tienda carousel above is intentionally unfiltered, so we never touch
  // .prods-rail here.
  let list = PRODUCTS.slice();
  if(S.ui.tiendaCat !== "all") list = list.filter(p => p.category === S.ui.tiendaCat);
  if(S.ui.tiendaQ) list = list.filter(p => p.name.toLowerCase().includes(S.ui.tiendaQ.toLowerCase()));

  const grid = document.querySelector('.prods');
  if(grid){
    const cards = list.map(p => productCardHTML(p)).join('');
    const empty = list.length === 0
      ? `<div style="grid-column:1/-1; text-align:center; padding:30px 0; color:var(--text-muted); font-size:13px;">Sin resultados.</div>`
      : '';
    grid.innerHTML = cards + empty;
  }
}
function openFillAlbumModal(){
  const br = missingBreakdown();
  if(br.count===0){ toast("¡Ya no te faltan stickers!"); return; }
  S.ui.modal = "fillAlbum";
  S.ui.modalData = {};
  renderModal();
}
function confirmFillAlbum(){
  const br = missingBreakdown();
  if(br.count===0){ toast("¡Ya no te faltan stickers!"); closeModal(); return; }
  cartAdd("CARTA-SUELTA", br.count);
  closeModal();
  go('carrito');
}
function buyAllMissing(){ openFillAlbumModal(); }

/* -------- FillAlbumPickModal: pick which missing stickers to buy --------
   Session-persistent selection (Set of sticker codes). On first open we seed
   with every missing code (mirrors "Comprar todas"); subsequent opens keep
   whatever the user left selected. DOM updates are granular — toggling one
   row never re-renders the whole modal. Sections >100 rows opt into
   browser-native virtualization via content-visibility:auto. */
const FILL_PICK_TIERS = [
  { key:"comun",   label:"Comunes",   icon:"●", price:5  },
  { key:"media",   label:"Medias",    icon:"★", price:15 },
  { key:"dificil", label:"Difíciles", icon:"◆", price:30 },
];
let _fillPickSelected = null; // Set<string> of sticker codes; null = uninit
let _fillPickQuery = "";
function _fillPickMissingByTier(){
  const out = { comun:[], media:[], dificil:[] };
  ALBUM.forEach(g => g.stickers.forEach(s => {
    const st = (S.album[g.id]||{})[s.n];
    if(st && st.owned > 0) return;
    const tier = (s.tier === "media" || s.tier === "dificil") ? s.tier : "comun";
    out[tier].push({ gid:g.id, n:s.n, code:s.code, group:g.name, prefix:g.prefix, emoji:g.emoji, label:s.label, price:s.price, tier });
  }));
  return out;
}
function _fillPickEnsureInit(){
  if(_fillPickSelected !== null) return;
  _fillPickSelected = new Set();
  const m = _fillPickMissingByTier();
  for(const t of FILL_PICK_TIERS) for(const it of m[t.key]) _fillPickSelected.add(it.code);
}
function openFillAlbumPickModal(){
  const br = missingBreakdown();
  if(br.count === 0){ toast("¡Ya no te faltan stickers!"); return; }
  _fillPickEnsureInit();
  if(!S.ui.modal) _modalLastFocus = document.activeElement;
  S.ui.modal = "fillAlbumPick";
  S.ui.modalData = {};
  renderModal();
  setTimeout(() => focusFirstInModal(), 50);
}
function _fillPickRowHTML(it){
  const checked = _fillPickSelected.has(it.code);
  return `<div class="fap-row${checked?' selected':''}" data-code="${esc(it.code)}" data-tier="${it.tier}" role="button" tabindex="0" onclick="fillPickToggle('${esc(it.code)}')" onkeydown="if(event.key===' '||event.key==='Enter'){event.preventDefault();fillPickToggle('${esc(it.code)}')}">`
    + `<div class="fap-cb" role="checkbox" aria-checked="${checked?'true':'false'}" aria-label="${esc(it.code)}"></div>`
    + `<div class="fap-meta">`
      + `<div class="fap-code">${esc(it.code)}</div>`
      + `<div class="fap-team">${esc(it.emoji)} ${esc(it.group)} · #${it.n}</div>`
    + `</div>`
    + `<div class="fap-price">${fmt(it.price)}</div>`
  + `</div>`;
}
function _fillPickFilteredItems(tier){
  const m = _fillPickMissingByTier();
  const items = m[tier] || [];
  if(!_fillPickQuery) return items;
  return items.filter(it => it.code.indexOf(_fillPickQuery) >= 0);
}
function _fillPickSectionState(tier){
  const items = _fillPickFilteredItems(tier);
  const sel = items.reduce((n, it) => n + (_fillPickSelected.has(it.code) ? 1 : 0), 0);
  return { items, sel, total: items.length };
}
function _fillPickFooterTotals(){
  let n = 0, total = 0;
  if(!_fillPickSelected) return { n, total };
  ALBUM.forEach(g => g.stickers.forEach(s => {
    if(_fillPickSelected.has(s.code)){ n++; total += s.price; }
  }));
  return { n, total };
}
function renderFillAlbumPickModal(){
  _fillPickEnsureInit();
  const sectionsHTML = FILL_PICK_TIERS.map(t => {
    const all = _fillPickMissingByTier()[t.key] || [];
    if(all.length === 0) return "";
    const { items, sel, total } = _fillPickSectionState(t.key);
    const allChecked = total > 0 && sel === total;
    const triState = allChecked ? "true" : (sel > 0 ? "mixed" : "false");
    const virt = all.length > 100 ? " fap-virt" : "";
    const rowsHTML = items.length
      ? items.map(_fillPickRowHTML).join("")
      : `<div class="fap-empty">Sin coincidencias en esta sección.</div>`;
    return `
      <div class="fap-section">
        <div class="fap-section-head l-${t.key}">
          <div class="fap-ico">${t.icon}</div>
          <div class="fap-section-title">
            <div class="fap-name">${t.label} <span class="fap-tier-price">$${t.price}</span></div>
            <div class="fap-section-count" id="fap-count-${t.key}">${sel} seleccionada${sel===1?'':'s'} / ${total} total${total===1?'':'es'}</div>
          </div>
          <button type="button" class="fap-all-btn tap" id="fap-all-${t.key}" role="checkbox" aria-checked="${triState}" aria-label="Seleccionar todas las ${t.label.toLowerCase()}" onclick="fillPickToggleAll('${t.key}')">
            <span class="fap-cb fap-cb-lg" data-state="${triState}"></span>
            <span class="fap-all-lbl">Todas</span>
          </button>
        </div>
        <div class="fap-list${virt}" id="fap-list-${t.key}">${rowsHTML}</div>
      </div>
    `;
  }).join("");
  const totals = _fillPickFooterTotals();
  const buyDisabled = totals.n === 0 ? " disabled" : "";
  const clearDisabled = totals.n === 0 ? " disabled" : "";
  const empty = !sectionsHTML
    ? `<div class="empty"><div class="em">🏆</div><div class="disp" style="font-size:18px;">Ya no te faltan stickers</div></div>`
    : "";
  return `
    <div class="handle" aria-hidden="true"></div>
    <button class="close-x tap" onclick="closeModal()" aria-label="Cerrar">✕</button>
    <h2 id="modal-title">Elegir cartitas</h2>
    <div class="fap-search-wrap">
      <div class="search" style="margin:0;">
        <span>🔍</span>
        <input id="fap-search" type="text" placeholder="Buscar código (MEX07, ARG10…)" value="${esc(_fillPickQuery)}" oninput="fillPickSearch(this.value)" autocomplete="off" autocapitalize="characters" spellcheck="false" />
        ${_fillPickQuery ? `<button class="tap" style="color:var(--text-faint); font-size:16px; padding:0 4px;" onclick="fillPickSearch('')" aria-label="Limpiar búsqueda">✕</button>` : ``}
      </div>
    </div>
    <div class="fap-scroll" id="fap-scroll">${sectionsHTML}${empty}</div>
    <div class="fap-footer">
      <div class="fap-counter" id="fap-counter">${totals.n} seleccionada${totals.n===1?'':'s'} · Total <b style="color:var(--green);">${fmt(totals.total)}</b></div>
      <div class="fap-actions">
        <button id="fap-clear" class="btn ghost tap"${clearDisabled} onclick="fillPickClear()">Limpiar selección</button>
        <button id="fap-buy" class="btn primary tap"${buyDisabled} onclick="fillPickConfirm()">${totals.n === 0 ? 'Comprar seleccionadas' : 'Comprar seleccionadas (' + fmt(totals.total) + ')'}</button>
      </div>
    </div>
  `;
}
function _fillPickUpdateRow(code){
  const row = document.querySelector(`#fap-scroll .fap-row[data-code="${code}"]`);
  if(!row) return;
  const checked = _fillPickSelected.has(code);
  row.classList.toggle("selected", checked);
  const cb = row.querySelector(".fap-cb");
  if(cb) cb.setAttribute("aria-checked", checked ? "true" : "false");
}
function _fillPickUpdateSectionHeaders(){
  for(const t of FILL_PICK_TIERS){
    const { sel, total } = _fillPickSectionState(t.key);
    const cnt = document.getElementById("fap-count-" + t.key);
    if(cnt) cnt.textContent = `${sel} seleccionada${sel===1?'':'s'} / ${total} total${total===1?'':'es'}`;
    const btn = document.getElementById("fap-all-" + t.key);
    if(btn){
      const tri = total > 0 && sel === total ? "true" : (sel > 0 ? "mixed" : "false");
      btn.setAttribute("aria-checked", tri);
      const dot = btn.querySelector(".fap-cb");
      if(dot) dot.setAttribute("data-state", tri);
    }
  }
}
function _fillPickUpdateFooter(){
  const totals = _fillPickFooterTotals();
  const c = document.getElementById("fap-counter");
  if(c) c.innerHTML = `${totals.n} seleccionada${totals.n===1?'':'s'} · Total <b style="color:var(--green);">${fmt(totals.total)}</b>`;
  const buy = document.getElementById("fap-buy");
  if(buy){
    buy.disabled = totals.n === 0;
    buy.textContent = totals.n === 0 ? "Comprar seleccionadas" : `Comprar seleccionadas (${fmt(totals.total)})`;
  }
  const clr = document.getElementById("fap-clear");
  if(clr) clr.disabled = totals.n === 0;
}
function _fillPickRerenderListFor(tier){
  const list = document.getElementById("fap-list-" + tier);
  if(!list) return;
  const items = _fillPickFilteredItems(tier);
  list.innerHTML = items.length ? items.map(_fillPickRowHTML).join("") : `<div class="fap-empty">Sin coincidencias en esta sección.</div>`;
}
function fillPickToggle(code){
  if(!_fillPickSelected) return;
  if(_fillPickSelected.has(code)) _fillPickSelected.delete(code);
  else _fillPickSelected.add(code);
  _fillPickUpdateRow(code);
  _fillPickUpdateSectionHeaders();
  _fillPickUpdateFooter();
}
function fillPickToggleAll(tier){
  if(!_fillPickSelected) return;
  const all = (_fillPickMissingByTier()[tier] || []);
  const allChecked = all.length > 0 && all.every(it => _fillPickSelected.has(it.code));
  if(allChecked) all.forEach(it => _fillPickSelected.delete(it.code));
  else all.forEach(it => _fillPickSelected.add(it.code));
  _fillPickRerenderListFor(tier);
  _fillPickUpdateSectionHeaders();
  _fillPickUpdateFooter();
}
function fillPickClear(){
  if(!_fillPickSelected) return;
  _fillPickSelected.clear();
  for(const t of FILL_PICK_TIERS) _fillPickRerenderListFor(t.key);
  _fillPickUpdateSectionHeaders();
  _fillPickUpdateFooter();
}
function fillPickSearch(q){
  _fillPickQuery = (q || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  for(const t of FILL_PICK_TIERS) _fillPickRerenderListFor(t.key);
  _fillPickUpdateSectionHeaders();
  const inp = document.getElementById("fap-search");
  if(inp && inp.value !== q) inp.value = q;
}
function fillPickConfirm(){
  if(!_fillPickSelected || _fillPickSelected.size === 0) return;
  cartAdd("CARTA-SUELTA", _fillPickSelected.size);
  closeModal();
  go('carrito');
}

let _albumCtaHidden = false;
let _albumCtaTimer = null;
function dismissAlbumCta(e){
  if(e && typeof e.stopPropagation === "function") e.stopPropagation();
  _albumCtaHidden = true;
  if(_albumCtaTimer) clearTimeout(_albumCtaTimer);
  _albumCtaTimer = setTimeout(() => {
    _albumCtaHidden = false;
    _albumCtaTimer = null;
    render();
  }, 30000);
  render();
}

/* ---------- PRODUCTO ---------- */
function screenProducto(){
  const p = productById(S.params.id);
  if(!p){ back(); return ""; }
  const q = S.cart[p.id] || 0;
  return `
    ${topBar(p.name, true)}
    <div class="body">
      <div class="pd-hero${p.image?' has-photo':''}" style="background:#FFFFFF;">
        ${p.badge?`<div class="bd">${esc(p.badge)}</div>`:``}
        ${p.image
          ? `<img src="${esc(p.image)}" alt="${esc(p.name)}" class="pd-hero-img" />`
          : p.emoji}
      </div>
      <div class="pd-body">
        <div class="label">${esc(p.category)}</div>
        <div class="disp" style="font-size:24px; margin-top:3px;">${esc(p.name)}</div>
        <div class="pd-price">${fmt(p.price)}</div>
        <div class="pd-desc">${esc(p.description)}</div>
        <div class="info-list">
          <div class="info-row"><div class="ir">🚚</div><div><div class="il">Entrega</div><div class="iv">Hoy mismo en GDL</div></div></div>
          <div class="info-row"><div class="ir">🛡</div><div><div class="il">Oficial</div><div class="iv">Producto original Panini / FIFA 26</div></div></div>
          <div class="info-row"><div class="ir">↻</div><div><div class="il">Cambios</div><div class="iv">7 días si no abres el producto</div></div></div>
        </div>
      </div>
    </div>
    <div class="footer-bar">
      ${q===0
        ? `<button class="btn brand tap" onclick="cartAdd('${p.id}')">🛍 Agregar al carrito</button>`
        : `<div style="display:flex; align-items:center; gap:6px; background:var(--surface-2); border-radius:999px; padding:3px;">
             <button class="tap" style="width:44px; height:44px; border-radius:999px; background:var(--surface); color:var(--text); border:1px solid var(--border);" onclick="cartSub('${p.id}')" aria-label="Restar uno">−</button>
             <div class="disp" style="width:24px; text-align:center;" aria-live="polite" aria-label="Cantidad en carrito">${q}</div>
             <button class="tap" style="width:44px; height:44px; border-radius:999px; background:var(--green); color:#fff;" onclick="cartAdd('${p.id}')" aria-label="Sumar uno">+</button>
           </div>
           <button class="btn primary tap" style="flex:1;" onclick="go('carrito')">Ver carrito →</button>`}
    </div>
    ${bottomNav()}`;
}

/* ---------- CARRITO ---------- */
function deliveryFee(){
  if(S.ui.delivery==="pickup") return 0;
  if(S.ui.delivery==="gdl") return 50;
  if(S.ui.delivery==="nacional") return 150;
  return 0;
}
function deliveryLabel(){ return S.ui.delivery==="pickup"?"Pickup (gratis)":S.ui.delivery==="gdl"?"Envío GDL":"Envío Nacional"; }
function screenCarrito(){
  const items = cartItems();
  const sub = cartSubtotal();
  const fee = deliveryFee();
  const credit = welcomeCreditAvailable();
  const total = Math.max(0, sub - credit) + fee;
  if(items.length===0){
    return `
      ${topBar("Carrito", true, true)}
      <div class="body">
        <div class="empty">
          <div class="em">🛒</div>
          <div class="disp" style="font-size:20px;">Tu carrito está vacío</div>
          <div style="font-size:13px; color:var(--text-muted); margin-top:4px;">Visita la tienda para agregar productos.</div>
          <div style="margin-top:20px;"><button class="btn brand tap" onclick="reset('tienda')">Ir a la tienda →</button></div>
        </div>
      </div>
      ${bottomNav()}`;
  }
  return `
    ${topBar("Carrito", true, true)}
    <div class="body">
      <div style="padding:10px 14px; display:flex; flex-direction:column; gap:8px;">
        ${items.map(it => `
          <div class="card" style="padding:0;">
            <div class="cart-item">
              <div class="img" style="background:#FFFFFF;">${it.image ? `<img src="${esc(it.image)}" alt="" class="pimg" />` : it.emoji}</div>
              <div class="cart-item-info">
                <div class="disp" style="font-size:13px;">${esc(it.name)}</div>
                <div class="disp" style="font-size:15px; color:var(--green); margin-top:2px;">${fmt(it.price*it.qty)}</div>
                <div class="qty">
                  <button class="tap" onclick="cartSub('${it.id}')" aria-label="Restar uno de ${esc(it.name)}">−</button>
                  <div class="num">${it.qty}</div>
                  <button class="tap add" onclick="cartAdd('${it.id}')" aria-label="Sumar uno de ${esc(it.name)}">+</button>
                </div>
              </div>
              <button class="cart-item-rm tap" onclick="cartRm('${it.id}')" aria-label="Eliminar ${esc(it.name)} del carrito" title="Quitar">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                  <path d="M10 11v6"/><path d="M14 11v6"/>
                  <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>
                </svg>
                <span class="cart-item-rm-label">Quitar</span>
              </button>
            </div>
          </div>`).join("")}

        <div class="form-group">
          <div class="form-title">ENTREGA</div>
          <div class="delivery-opts">
            <div class="delivery-opt ${S.ui.delivery==='pickup'?'selected':''}" onclick="S.ui.delivery='pickup';render()">
              <div class="radio"></div>
              <div class="body">
                <div class="t">Pickup · Gratis</div>
                <div class="s">Recoge en Av. Chapultepec 100, Lafayette, GDL</div>
              </div>
              <div class="p">$0</div>
            </div>
            <div class="delivery-opt ${S.ui.delivery==='gdl'?'selected':''}" onclick="S.ui.delivery='gdl';render()">
              <div class="radio"></div>
              <div class="body">
                <div class="t">Envío GDL · &lt; 1 hora</div>
                <div class="s">Zona metropolitana de Guadalajara</div>
              </div>
              <div class="p">$50</div>
            </div>
            <div class="delivery-opt ${S.ui.delivery==='nacional'?'selected':''}" onclick="S.ui.delivery='nacional';render()">
              <div class="radio"></div>
              <div class="body">
                <div class="t">Envío Nacional · 1–2 días</div>
                <div class="s">Resto del país (guía automática)</div>
              </div>
              <div class="p">$150</div>
            </div>
          </div>
          ${(S.ui.delivery==="nacional" || S.ui.delivery==="gdl") ? (() => {
            if(!S.user.addressForm) S.user.addressForm = {};
            const af = S.user.addressForm;
            const verified = !!(S.user.addressDetails && S.user.addressDetails.lat);
            const isGdl = S.ui.delivery === "gdl";
            const outOfZone = !!(isGdl && verified && S.user.addressOutOfZone);
            return `
            <div class="addr-card">
              ${isGdl ? `<div class="addr-zone-note"><span class="pin">📍</span><span>Solo cubrimos la zona metropolitana de Guadalajara (Zapopan, Centro, Tlaquepaque, Las Águilas, ITESO).</span></div>` : ``}
              <button type="button" class="addr-loc-btn" onclick="requestUserLocation()">
                <span class="pin">📍</span><span>Usar mi ubicación</span>
              </button>
              <div class="field">
                <div class="flbl">${isGdl ? 'Dónde llevamos tu pedido' : 'Dirección o lugar de entrega'}</div>
                <div class="addr-search" id="checkout-address-ac">
                  <input id="checkout-address-fallback" placeholder="${isGdl ? 'Tu dirección dentro de GDL…' : 'Empieza a escribir tu dirección…'}" value="${esc(S.user.address || '')}" oninput="S.user.address=this.value;S.user.addressDetails=null;S.user.addressOutOfZone=false;persist();updateAddressStatus()" autocomplete="off" />
                </div>
                <div id="address-status" class="verified-badge ${verified && !outOfZone ? 'ok' : ''}" style="margin-top:8px;">
                  <span class="dot">✓</span>
                  <span>${verified && !outOfZone ? 'Domicilio verificado con Google Maps' : (verified && outOfZone ? 'Dirección encontrada — pero fuera del radio de cobertura' : 'Selecciona una sugerencia o usa tu ubicación')}</span>
                </div>
              </div>
              ${outOfZone ? `
                <div class="addr-warn">
                  <div class="addr-warn-t">⚠️ Fuera de cobertura local</div>
                  <div class="addr-warn-s">Tu dirección está fuera de nuestra zona de envío local. Tus opciones:</div>
                  <div class="addr-warn-opts">
                    <button type="button" class="addr-warn-btn" onclick="S.ui.delivery='nacional';render()">Solicitar Envío Nacional ($150)</button>
                    <button type="button" class="addr-warn-btn alt" onclick="S.ui.delivery='pickup';render()">Pasar a recoger (gratis)</button>
                  </div>
                </div>
              ` : ``}
              <label class="check-row">
                <input type="checkbox" ${af.sin_numero ? 'checked' : ''} onchange="S.user.addressForm.sin_numero=this.checked;persist()" />
                <span>Mi calle no tiene número</span>
              </label>
              <div class="field-grid-2">
                <div class="field">
                  <div class="flbl">Estado</div>
                  <input id="af-estado" value="${esc(af.estado || '')}" oninput="S.user.addressForm.estado=this.value;persist()" placeholder="Jalisco" />
                </div>
                <div class="field">
                  <div class="flbl">Municipio o alcaldía</div>
                  <input id="af-municipio" value="${esc(af.municipio || '')}" oninput="S.user.addressForm.municipio=this.value;persist()" placeholder="Guadalajara" />
                </div>
              </div>
              <div class="field-grid-2">
                <div class="field">
                  <div class="flbl">Localidad</div>
                  <input id="af-localidad" value="${esc(af.localidad || '')}" oninput="S.user.addressForm.localidad=this.value;persist()" placeholder="Guadalajara" />
                </div>
                <div class="field">
                  <div class="flbl">Colonia o barrio</div>
                  <input id="af-colonia" value="${esc(af.colonia || '')}" oninput="S.user.addressForm.colonia=this.value;persist()" placeholder="Country Club" />
                </div>
              </div>
              <div class="field-grid-2">
                <div class="field">
                  <div class="flbl">Código Postal</div>
                  <input id="af-cp" value="${esc(af.cp || '')}" ${af.cp_unknown ? 'disabled' : ''} oninput="S.user.addressForm.cp=this.value;persist()" placeholder="44600" inputmode="numeric" maxlength="5" />
                  <label class="check-row muted" style="margin-top:6px;">
                    <input type="checkbox" ${af.cp_unknown ? 'checked' : ''} onchange="S.user.addressForm.cp_unknown=this.checked;persist();render()" />
                    <span>No sé mi CP</span>
                  </label>
                </div>
                <div class="field">
                  <div class="flbl">Núm. interior / Depto. (opcional)</div>
                  <input value="${esc(af.numero_interior || '')}" oninput="S.user.addressForm.numero_interior=this.value;persist()" placeholder="Ej: 201" />
                </div>
              </div>
              <div class="addr-divider"></div>
              <div>
                <div class="addr-section-title">Datos de contacto</div>
                <div class="addr-section-sub">Te llamaremos si hay un problema con la entrega.</div>
              </div>
              <div class="field-grid-2">
                <div class="field">
                  <div class="flbl">Nombre y apellido</div>
                  <input value="${esc(S.user.name || '')}" oninput="S.user.name=this.value;persist()" placeholder="Pablo Díaz del Castillo" />
                </div>
                <div class="field">
                  <div class="flbl">Teléfono</div>
                  <input value="${esc(S.user.phone || '')}" oninput="S.user.phone=this.value;persist()" placeholder="+52 33 1234 5678" inputmode="tel" />
                </div>
              </div>
            </div>`;
          })() : ``}
        </div>

        <div class="form-group">
          <div class="form-title">RESUMEN</div>
          <div class="card" style="padding:14px;">
            <div class="line"><span style="color:var(--text-muted);">Subtotal</span><span class="v">${fmt(sub)}</span></div>
            <div class="line"><span style="color:var(--text-muted);">${deliveryLabel()}</span><span class="v">${fee===0?"Gratis":fmt(fee)}</span></div>
            ${credit > 0 ? `<div class="line" style="color:var(--green);"><span>🎁 Crédito de bienvenida</span><span class="v" style="color:var(--green);">−${fmt(credit)}</span></div>` : ``}
            <div style="height:1px; background:var(--surface-2); margin:8px 0;"></div>
            <div style="display:flex; justify-content:space-between; align-items:flex-end;">
              <div class="label">Total</div>
              <div class="disp" style="font-size:22px; color:var(--green);">${fmt(total)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="footer-bar">
      <button class="btn primary tap" onclick="go('checkout')">Continuar al pago →</button>
    </div>
    ${bottomNav()}`;
}

/* ---------- CHECKOUT ---------- */
function screenCheckout(){
  ensureReferralShape();
  const sub = cartSubtotal();
  const fee = deliveryFee();
  const credit = welcomeCreditAvailable();
  const headroom = Math.max(0, sub - credit);
  const refCap = referralCreditCap(sub);
  const refApplied = referralCreditApplied(sub, headroom);
  const balance = S.referral.balance;
  const total = Math.max(0, sub - credit - refApplied) + fee;
  const pm = S.ui.payMethod;
  const canCash = S.ui.delivery !== "nacional";
  return `
    ${topBar("Checkout", true, true)}
    <div class="body">
      <div style="padding:10px 14px 12px;">
        <div class="form-group">
          <div class="form-title">Contacto</div>
          <div class="form-card">
            <div class="field"><div class="flbl" id="lbl-co-name">Nombre</div><input aria-labelledby="lbl-co-name" autocomplete="name" value="${esc(S.user.name)}" oninput="S.user.name=this.value;persist()" /></div>
            <div class="field"><div class="flbl" id="lbl-co-phone">Teléfono</div><input aria-labelledby="lbl-co-phone" type="tel" autocomplete="tel" value="${esc(S.user.phone)}" oninput="S.user.phone=this.value;persist()" /></div>
          </div>
        </div>

        <div class="form-group">
          <div class="form-title">Método de pago</div>
          <div class="form-card">
            <div class="pay-options">
              <button class="pay-option tap ${pm==='card'?'active':''}" onclick="S.ui.payMethod='card';render()">💳 Tarjeta</button>
              <button class="pay-option tap ${pm==='cash'?'active':''} ${!canCash?'':''}" onclick="${canCash?`S.ui.payMethod='cash';render()`:`toast('Efectivo no disponible para envío nacional')`}" ${!canCash?'style="opacity:.4"':''}>💵 Efectivo</button>
            </div>
            ${pm==='card'?`
              <div class="field" style="margin-top:4px;"><div class="flbl" id="lbl-co-card">Número tarjeta</div><input aria-labelledby="lbl-co-card" inputmode="numeric" autocomplete="cc-number" value="4242 4242 4242 4242" /></div>
              <div style="display:flex; gap:8px;">
                <div class="field" style="flex:1;"><div class="flbl" id="lbl-co-exp">Expira</div><input aria-labelledby="lbl-co-exp" inputmode="numeric" autocomplete="cc-exp" value="12/28" /></div>
                <div class="field" style="flex:1;"><div class="flbl" id="lbl-co-cvc">CVC</div><input aria-labelledby="lbl-co-cvc" inputmode="numeric" autocomplete="cc-csc" value="123" /></div>
              </div>
              <div style="font-size:11px; color:var(--text-muted);">🔒 Demo · En producción integra Stripe.</div>
            `:``}
          </div>
        </div>

        <div class="form-group">
          <div class="form-title">Entrega</div>
          <div class="card" style="padding:14px;">
            <div class="line"><span style="color:var(--text-muted);">${deliveryLabel()}</span><span class="v">${fee===0?"Gratis":fmt(fee)}</span></div>
          </div>
        </div>

        ${balance > 0 ? `
        <div class="form-group">
          <div class="form-title">Saldo de referidos</div>
          <div class="card" style="padding:14px;">
            <div class="line"><span style="color:var(--text-muted);">Disponible</span><span class="v" style="color:var(--green);">${fmt(balance)}</span></div>
            ${refCap > 0 ? `
              <label class="check-row" style="margin-top:10px;">
                <input type="checkbox" ${S.referral.useCredit ? 'checked' : ''} onchange="toggleUseReferralCredit()" />
                <span>Usar mi saldo en este pedido (hasta el 100% del total)</span>
              </label>
              <div style="font-size:11px; color:var(--text-muted); margin-top:6px;">${S.referral.useCredit ? `Aplicarás ${fmt(refApplied)} de descuento.` : `Toggle activo descuenta hasta ${fmt(refCap)}.`}</div>
            ` : `
              <div style="font-size:12px; color:var(--text-muted); margin-top:6px;">Tu saldo se aplica en pedidos donde el descuento mínimo sea ${fmt(MIN_CREDIT_APPLY)}.</div>
            `}
            <div style="font-size:11px; color:var(--text-muted); margin-top:6px;">Tu saldo se usa como descuento en la app · No es retirable en efectivo.</div>
          </div>
        </div>
        ` : ``}

        <div class="form-group">
          <div class="card" style="padding:14px;">
            <div class="line"><span style="color:var(--text-muted);">Productos</span><span class="v">${fmt(sub)}</span></div>
            <div class="line"><span style="color:var(--text-muted);">Envío</span><span class="v">${fee===0?"Gratis":fmt(fee)}</span></div>
            ${credit > 0 ? `<div class="line" style="color:var(--green);"><span>🎁 Crédito de bienvenida</span><span class="v" style="color:var(--green);">−${fmt(credit)}</span></div>` : ``}
            ${refApplied > 0 ? `<div class="line" style="color:var(--green);"><span>💸 Crédito de referidos</span><span class="v" style="color:var(--green);">−${fmt(refApplied)}</span></div>` : ``}
            <div style="height:1px; background:var(--surface-2); margin:8px 0;"></div>
            <div style="display:flex; justify-content:space-between; align-items:flex-end;">
              <div class="label">Total</div>
              <div class="disp" style="font-size:22px; color:var(--green);">${fmt(total)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="footer-bar">
      <button class="btn primary tap" onclick="submitCheckout()">Pagar ${fmt(total)} →</button>
    </div>
    ${bottomNav()}`;
}
const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/+$/, "");
async function submitCheckout(){
  const btn = document.querySelector(".footer-bar .btn.primary");
  const items = cartItems();
  if(items.length===0){ toast("Tu carrito está vacío"); return; }

  const subtotal = cartSubtotal();
  const credit = welcomeCreditAvailable();
  const refApplied = referralCreditApplied(subtotal, Math.max(0, subtotal - credit));
  const discount = credit + refApplied;
  const total = Math.max(0, subtotal - discount) + deliveryFee();
  if(!(total > 0)){ toast("El total debe ser mayor a 0"); return; }

  if(S.ui.delivery === "gdl" && S.user.addressOutOfZone){
    toast("Tu dirección está fuera de cobertura local");
    return;
  }

  let payloadItems;
  if(discount > 0){
    const titles = items.map(i => `${i.qty}× ${i.name}`).join(", ");
    payloadItems = [{
      title: `Mundial26 — ${titles}`.slice(0, 240),
      quantity: 1,
      unit_price: Math.max(1, subtotal - discount),
    }];
  } else {
    payloadItems = items.map(i => ({
      title: i.name,
      quantity: i.qty,
      unit_price: Number(i.price),
    }));
  }

  const payload = {
    items: payloadItems,
    user: {
      name: (S.user.name || "").trim(),
      phone: (S.user.phone || "").trim(),
      email: (S.user.email || "").trim() || undefined,
      address: (S.user.address || "").trim(),
      city: (S.user.city || "").trim() || undefined,
      addressDetails: S.user.addressDetails || undefined,
      addressForm: S.user.addressForm || undefined,
    },
    delivery: S.ui.delivery,
    referralCode: (S.referral && S.referral.applied) ? S.referral.applied : undefined,
    welcomeCredit: credit > 0 ? credit : undefined,
    referralCredit: refApplied > 0 ? refApplied : undefined,
  };
  const valid = CheckoutPayloadSchema.safeParse(payload);
  if(!valid.success){
    const first = valid.error.issues[0];
    const path = first?.path?.join(".") || "";
    if(path.startsWith("user.phone")) toast("Falta teléfono válido");
    else if(path.startsWith("user.address")) toast("Falta dirección");
    else if(path.startsWith("user.name")) toast("Falta nombre");
    else toast("Revisa los datos del checkout");
    return;
  }
  if(!BACKEND_URL){
    toast("Configura VITE_BACKEND_URL en .env.local y reinicia vite");
    captureException(new Error("VITE_BACKEND_URL is empty"), { tags: { mutation: "submitCheckout" } });
    return;
  }

  try {
    if(btn){ btn.setAttribute("disabled","true"); btn.textContent = "Generando pago…"; }
    const r = await fetch(`${BACKEND_URL}/api/preference`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(valid.data),
    });
    if(!r.ok){
      const body = await r.json().catch(()=>({}));
      const msg = body?.message || body?.error || `HTTP ${r.status}`;
      toast("No se pudo iniciar el pago: " + msg);
      captureException(new Error("preference failed"), { extra: { status: r.status, body } });
      if(btn){ btn.removeAttribute("disabled"); btn.textContent = `Pagar ${fmt(total)} →`; }
      return;
    }
    const { init_point, preferenceId, orderNumber } = await r.json();
    // Stage referral credit deduction now: balance drops immediately so the
    // user can't double-spend across tabs while MP processes the payment.
    // The success/failure handler finalizes (commits) or reverts.
    if(refApplied > 0){
      const taken = useReferralCredit(refApplied);
      ensureReferralShape();
      S.referral.pendingCredit = { orderNumber, amount: taken };
    }
    // Stash so /success can show summary even if MP redirect drops query.
    S.pendingOrder = {
      orderNumber, preferenceId, total, items: valid.data.items, delivery: S.ui.delivery,
      createdAt: new Date().toISOString(),
    };
    persist();
    window.location.href = init_point;
  } catch(err){
    handleMutationError("submitCheckout", err);
    toast("Error de red al iniciar el pago");
    if(btn){ btn.removeAttribute("disabled"); btn.textContent = `Pagar ${fmt(total)} →`; }
  }
}

/* ---------- SUCCESS / FAILURE (Mercado Pago return) ---------- */
async function pollOrderStatus(orderNumber){
  if(!BACKEND_URL || !orderNumber) return null;
  // Webhook may fire just before/after the user is redirected. Poll a few times.
  const delays = [0, 600, 1200, 2400];
  for(const d of delays){
    if(d) await new Promise(r => setTimeout(r, d));
    try {
      const r = await fetch(`${BACKEND_URL}/api/order/${encodeURIComponent(orderNumber)}`);
      if(r.ok){
        const o = await r.json();
        if(o && o.status === "paid") return o;
        if(d === delays[delays.length-1]) return o;
      }
    } catch {}
  }
  return null;
}
function ensureSuccessOrderRecorded(remote){
  if(!remote || !remote.orderNumber) return;
  const exists = S.orders.find(o => o.orderNumber === remote.orderNumber);
  if(exists){ Object.assign(exists, { status: remote.status === "paid" ? "PAID" : exists.status, paymentId: remote.paymentId }); return; }
  S.orders.unshift({
    orderNumber: remote.orderNumber,
    date: (remote.createdAt || new Date().toISOString()).slice(0,10),
    items: (remote.items || []).map(i => ({ id: i.id || i.title, qty: i.quantity || i.qty || 1, name: i.title || i.name, price: i.unit_price || i.price || 0 })),
    total: remote.total,
    status: remote.status === "paid" ? "PAID" : "PENDING",
    delivery: remote.delivery || "pickup",
    paymentId: remote.paymentId,
  });
}
function screenSuccess(){
  const params = S.params || {};
  const orderNumber = params.orderNumber || (S.pendingOrder && S.pendingOrder.orderNumber) || "";
  const remoteStatus = params.remoteStatus || "checking"; // checking | paid | pending | unknown
  const total = (params.remoteTotal != null ? params.remoteTotal : (S.pendingOrder ? S.pendingOrder.total : null));
  const paymentId = params.paymentId || "";

  if(remoteStatus === "paid" && S.referral && !S.referral.welcomeCreditUsed && S.referral.applied){
    S.referral.welcomeCreditUsed = true;
    S.referral.welcomeCredit = 0;
    persist();
  }
  // Finalize the staged referral credit deduction once the payment confirms.
  // For pending/unknown we leave it staged — bootMpReturn calls back when the
  // status flips. screenFailure handles the revert.
  if(remoteStatus === "paid" && S.referral && S.referral.pendingCredit && S.referral.pendingCredit.orderNumber === orderNumber){
    S.referral.pendingCredit = null;
    persist();
  }

  let banner;
  if(remoteStatus === "paid"){
    banner = `<div class="check">✓</div><div class="gol">¡PAGADO!</div><div class="disp" style="font-size:20px; margin-top:4px;">Pago confirmado</div>`;
  } else if(remoteStatus === "checking"){
    banner = `<div class="check" style="background:rgba(0,0,0,0.06); color:var(--text-muted);">…</div><div class="gol">Verificando…</div><div class="disp" style="font-size:18px; margin-top:4px;">Confirmando tu pago con Mercado Pago</div>`;
  } else {
    banner = `<div class="check" style="background:rgba(206,17,38,0.12); color:var(--red);">⏳</div><div class="gol">Pendiente</div><div class="disp" style="font-size:18px; margin-top:4px;">Pago en proceso. Te avisamos cuando se acredite.</div>`;
  }

  return `
    ${topBar("Pago", false, true)}
    <div class="body">
      <div class="orden-ok">
        ${banner}
        <div class="card" style="padding:16px; margin-top:20px; text-align:left;">
          <div class="label">Número de pedido</div>
          <div class="disp" style="font-size:20px; margin-top:2px;">${esc(orderNumber || "—")}</div>
          <div style="height:1px; background:var(--surface-2); margin:12px 0;"></div>
          <div class="label">Total</div>
          <div class="disp" style="font-size:20px; color:var(--green); margin-top:2px;">${total != null ? fmt(total) : "—"}</div>
          ${paymentId ? `<div style="height:1px; background:var(--surface-2); margin:12px 0;"></div>
          <div class="label">ID de pago</div>
          <div class="mono" style="font-size:13px; margin-top:2px;">${esc(paymentId)}</div>` : ``}
        </div>
        <div style="display:flex; gap:8px; margin-top:18px;">
          <button class="btn ghost tap" style="flex:1;" onclick="reset('tienda')">Seguir comprando</button>
          <button class="btn brand tap" style="flex:1;" onclick="reset('album')">Ver mi álbum</button>
        </div>
      </div>
    </div>
    ${bottomNav()}`;
}
function screenFailure(){
  const params = S.params || {};
  const orderNumber = params.orderNumber || (S.pendingOrder && S.pendingOrder.orderNumber) || "";
  // Restore staged referral credit — the order didn't go through.
  if(S.referral && S.referral.pendingCredit && (!orderNumber || S.referral.pendingCredit.orderNumber === orderNumber)){
    revertReferralCredit(S.referral.pendingCredit.amount);
    S.referral.pendingCredit = null;
    persist();
  }
  return `
    ${topBar("Pago", false, true)}
    <div class="body">
      <div class="orden-ok">
        <div class="check" style="background:rgba(206,17,38,0.12); color:var(--red);">✕</div>
        <div class="gol">Pago no completado</div>
        <div class="disp" style="font-size:18px; margin-top:4px;">No pudimos procesar tu pago.</div>
        ${orderNumber ? `<div class="card" style="padding:16px; margin-top:20px; text-align:left;">
          <div class="label">Pedido</div>
          <div class="disp" style="font-size:18px; margin-top:2px;">${esc(orderNumber)}</div>
        </div>` : ``}
        <div style="display:flex; gap:8px; margin-top:18px;">
          <button class="btn ghost tap" style="flex:1;" onclick="reset('carrito')">Volver al carrito</button>
          <button class="btn brand tap" style="flex:1;" onclick="reset('checkout')">Reintentar</button>
        </div>
      </div>
    </div>
    ${bottomNav()}`;
}
async function bootMpReturn(){
  // Read /success or /failure from window.location and kick off background reconciliation.
  const path = window.location.pathname || "/";
  const search = new URLSearchParams(window.location.search || "");
  const isSuccess = path === "/success" || path.endsWith("/success");
  const isFailure = path === "/failure" || path.endsWith("/failure");
  if(!isSuccess && !isFailure) return false;

  const paymentId = search.get("payment_id") || "";
  const externalRef = search.get("external_reference") || "";
  const orderNumber = externalRef || (S.pendingOrder && S.pendingOrder.orderNumber) || "";
  const status = search.get("status") || "";

  if(isFailure){
    S.screen = "checkout-failure";
    S.params = { orderNumber, paymentId, status };
    // Clean URL so a refresh doesn't re-trigger this screen.
    history.replaceState({}, "", "/");
    return true;
  }

  S.screen = "checkout-success";
  S.params = { orderNumber, paymentId, status, remoteStatus: "checking" };
  history.replaceState({}, "", "/");

  // Confirm with backend in the background, then update.
  const remote = await pollOrderStatus(orderNumber);
  if(remote){
    ensureSuccessOrderRecorded(remote);
    if(remote.status === "paid"){
      cartClear();
      S.pendingOrder = null;
    }
    S.params = Object.assign({}, S.params, {
      remoteStatus: remote.status === "paid" ? "paid" : "pending",
      remoteTotal: remote.total,
      paymentId: paymentId || remote.paymentId || "",
    });
  } else {
    S.params = Object.assign({}, S.params, { remoteStatus: "unknown" });
  }
  render();
  return true;
}

/* ---------- ORDEN ---------- */
function screenOrden(){
  const n = S.params.orderNumber;
  const o = S.orders.find(x => x.orderNumber===n);
  const eta = o ? (o.delivery==="pickup" ? "Recoge cuando quieras" : o.delivery==="gdl" ? "< 1 hora" : "1–2 días") : "—";
  return `
    ${topBar("Pedido confirmado", true, true)}
    <div class="body">
      <div class="orden-ok">
        <div class="check">✓</div>
        <div class="gol">¡GOL!</div>
        <div class="disp" style="font-size:20px; margin-top:4px;">Gracias por tu pedido</div>
        <div style="font-size:13px; color:var(--text-muted); margin-top:4px;">Te enviamos confirmación por WhatsApp.</div>
        <div class="card" style="padding:16px; margin-top:20px; text-align:left;">
          <div class="label">Número de pedido</div>
          <div class="disp" style="font-size:20px; margin-top:2px;">${esc(n)}</div>
          <div style="height:1px; background:var(--surface-2); margin:12px 0;"></div>
          <div class="label">Total</div>
          <div class="disp" style="font-size:20px; color:var(--green); margin-top:2px;">${o?fmt(o.total):"—"}</div>
          <div style="height:1px; background:var(--surface-2); margin:12px 0;"></div>
          <div class="label">ETA estimado</div>
          <div class="disp" style="font-size:20px; margin-top:2px;">${eta}</div>
        </div>
        <div style="display:flex; gap:8px; margin-top:18px;">
          <button class="btn ghost tap" style="flex:1;" onclick="reset('tienda')">Seguir comprando</button>
          <button class="btn brand tap" style="flex:1;" onclick="reset('album')">Ver mi álbum</button>
        </div>
      </div>
    </div>
    ${bottomNav()}`;
}

/* ---------- QR / SWAP PROTOCOL ----------
   Two-step P2P swap over QR codes:
   1. Owner shows OFFER QR (their dups + needs).
   2. Scanner picks what to take/give → updates locally → shows RECEIPT QR.
   3. Owner scans receipt → updates locally. Both albums in sync.
   Payload = "M26:" + LZString(JSON) → fits in a real QR. */
// Cap how many faltantes ride along inside the QR. Past ~80 the QR becomes
// dense enough that phone cameras struggle to lock on, and in practice the
// peer only needs to know which of THEIR repetidas you'd accept — they don't
// need the full 461-item list. We always include all repetidas (rarely many)
// and trim faltantes to keep the QR visually clean and easy to scan.
const FALTANTES_IN_QR_MAX = 80;

function buildOfferState(){
  const repetidas = [], faltantes = [];
  ALBUM.forEach(g => g.stickers.forEach(s => {
    const st = (S.album[g.id]||{})[s.n];
    if(st && st.owned > 1) repetidas.push(s.code);
    if(!st || st.owned === 0) faltantes.push(s.code);
  }));
  return {
    username: S.user.username || "anon",
    name: S.user.name || "",
    avatar: S.user.avatar || "",
    repetidas,
    // What goes IN the QR — keeps it scannable.
    faltantes: faltantes.slice(0, FALTANTES_IN_QR_MAX),
    // Full list still available locally for the screenSwap UI / future syncs.
    faltantesAll: faltantes,
    faltantesTruncated: faltantes.length > FALTANTES_IN_QR_MAX,
  };
}
function buildReceiptState(took, gave){
  return {
    username: S.user.username || "anon",
    name: S.user.name || "",
    took: (took||[]).slice(),
    gave: (gave||[]).slice(),
  };
}
function applySwapReceipt(payload){
  // Receipt comes from the OTHER user's perspective:
  //   k = what they took FROM ME → I must decrement those
  //   g = what they gave TO ME → I must increment those
  const took = Array.isArray(payload.k) ? payload.k : [];
  const gave = Array.isArray(payload.g) ? payload.g : [];
  let okIn = 0, okOut = 0;
  gave.forEach(code => {
    const p = parseCode(code); if(!p) return;
    if(!S.album[p.gid]) S.album[p.gid] = {};
    const cur = S.album[p.gid][p.n] || { owned: 0 };
    S.album[p.gid][p.n] = { owned: cur.owned + 1 };
    okIn++;
  });
  took.forEach(code => {
    const p = parseCode(code); if(!p) return;
    const cur = (S.album[p.gid]||{})[p.n] || { owned: 0 };
    if(cur.owned > 0){
      if(!S.album[p.gid]) S.album[p.gid] = {};
      S.album[p.gid][p.n] = { owned: cur.owned - 1 };
      if(S.album[p.gid][p.n].owned === 0) delete S.album[p.gid][p.n];
      okOut++;
    }
  });
  if(okIn > 0 || okOut > 0){
    S.swapsCount = (S.swapsCount||0) + 1;
    recordAlbumSnapshot();
    persist();
  }
  return { received: okIn, gave: okOut, peer: payload.u || "" };
}

function screenQR(){
  const offer = buildOfferState();
  let payloadText = "";
  let payloadErr = "";
  try { payloadText = encodeSwapOffer(offer); }
  catch(err){ payloadErr = err && err.message ? err.message : "Error"; console.error("[qr-offer] encode failed", err); }

  const totalFaltantes = (offer.faltantesAll || offer.faltantes).length;
  return `
    ${topBar("QR · Swaps", false, true, { showSettings: true })}
    <div class="body">
      <div class="qr-card">
        <div class="label">TU CÓDIGO QR DE INTERCAMBIO</div>
        <div class="qr-stage">
          <div class="qr-svg-wrap" id="qr-offer-wrap">
            <div id="qr-offer-target" class="qr-target">${payloadErr ? `<div class="qr-error">${esc(payloadErr)}</div>` : ``}</div>
          </div>
        </div>
        <div class="qr-username">@${esc(S.user.username)}</div>
        <div class="qr-counts">${offer.repetidas.length} repetidas · ${totalFaltantes} faltantes</div>
        <div class="qr-actions">
          <button class="btn ghost tap sm" onclick="copyText(${JSON.stringify(payloadText)})">Copiar código</button>
          <button class="btn ghost tap sm" onclick="render()">Refrescar</button>
        </div>
      </div>

      <div class="qr-divider">—  O  —</div>

      <div style="padding: 0 14px; display:flex; flex-direction:column; gap:10px;">
        <button class="btn primary tap" onclick="openScanIntent()">📷 Escanear QR de amigo</button>
        <div style="font-size:12px; color:var(--text-muted); text-align:center; padding: 0 8px; line-height:1.5;">
          Cuando escaneas el QR de alguien, ves sus repetidas que tú necesitas. Eliges, confirmas y tu álbum se actualiza al instante. Tu amigo escanea el recibo que generes para actualizar el suyo.
        </div>
      </div>

      ${(S.swapsCount||0) > 0 ? `
        <div class="shop-section-title">ACTIVIDAD</div>
        <div class="section-list">
          <div class="section-row"><div class="em">🤝</div><div class="body"><div class="n">${S.swapsCount} swap${S.swapsCount===1?'':'s'} confirmado${S.swapsCount===1?'':'s'}</div><div class="c">Total con tus amigos</div></div></div>
        </div>
      ` : ``}
    </div>
    ${bottomNav()}`;
}

async function renderOfferQR(){
  const target = document.getElementById("qr-offer-target");
  if(!target) return;
  const showError = (msg) => {
    target.innerHTML = `<div style="font-size:11px; color:var(--text-muted); text-align:center; padding:20px;">${esc(msg)}</div>`;
  };
  let text;
  try { text = encodeSwapOffer(buildOfferState()); }
  catch(err){
    console.error("[qr-offer] encode failed", err);
    showError("No se pudo construir el payload: " + (err && err.message ? err.message : "error"));
    return;
  }
  try {
    await renderQRSvg(target, text, { size: 320, errorCorrectionLevel: "L" });
  } catch(err){
    console.error("[qr-offer] render failed", err, "len:", text.length);
    if(err && /too big|version/i.test(String(err.message||""))){
      showError("Tu QR es muy grande (" + text.length + " chars). Marca menos cartas.");
    } else {
      showError("Error al dibujar QR: " + (err && err.message ? err.message : "desconocido"));
    }
  }
}

function handlePeerScan(text){
  // Try swap payload first
  const payload = decodeSwapPayloadStrict(text);
  if(payload){
    if(payload.t === "o"){
      // Offer from peer → enter swap screen
      S.swapPeer = payload;
      S.params = {};
      persist();
      go('swap');
      return;
    }
    if(payload.t === "r"){
      // Receipt from peer → apply inverse to my album
      const res = applySwapReceipt(payload);
      const peer = payload.u ? `@${payload.u}` : "Tu amigo";
      toast(`${peer} confirmó · +${res.received} / -${res.gave}`);
      reset('album');
      return;
    }
  }
  // Fall back to single sticker code
  const sp = parseCode(text);
  if(sp){
    stickerInc(sp.gid, sp.n);
    toast("+1 " + sp.sticker.code);
    return;
  }
  toast("QR no reconocido");
}

async function openScanIntent(){
  try {
    const mod = await import('./scanner.js');
    mod.openPeerScanner((text) => {
      try { handlePeerScan(text); }
      catch(err){ handleMutationError("openScanIntent.onResult", err); }
    }, { title: "Escanea el QR", hint: "Apunta al QR de intercambio de tu amigo" });
  } catch(err){
    handleMutationError("openScanIntent.load", err);
  }
}

// Legacy demo entry preserved for any old links — now triggers the real scanner.
function screenScan(){
  setTimeout(() => { if(S.screen === 'scan') openScanIntent(); }, 0);
  return `
    <div style="position:fixed; inset:0; background:#000; color:#fff; z-index:30;">
      <div style="display:flex; justify-content:space-between; align-items:center; padding:14px 16px;">
        <button class="back-btn tap" onclick="back()" style="color:#fff;" aria-label="Volver">‹</button>
        <div style="font-weight:700;">Abriendo cámara…</div>
        <div style="width:34px;"></div>
      </div>
    </div>`;
}

/* ---------- SWAP ----------
   When S.swapPeer is present (set by handlePeerScan after scanning a real
   offer QR), we compute the receive/give sets from peer.r / peer.n crossed
   with our album. peer.n (peer's faltantes) is optional — if absent, we
   still show what we can receive but skip the "Das" section. Otherwise fall
   back to the demo MOCK_FRIEND. */
function buildSwapDataFromPeer(peer){
  const peerOffers = Array.isArray(peer.r) ? peer.r : [];
  const peerNeeds  = Array.isArray(peer.n) ? peer.n : null;
  const myDups = [];
  ALBUM.forEach(g => g.stickers.forEach(s => {
    const st = (S.album[g.id]||{})[s.n];
    if(st && st.owned > 1) myDups.push(s.code);
  }));
  // intersection: peer's repetidas ∩ my faltantes
  const receive = peerOffers.filter(c => {
    const p = parseCode(c); if(!p) return false;
    const st = (S.album[p.gid]||{})[p.n];
    return !st || st.owned === 0;
  });
  // intersection: my repetidas ∩ peer's faltantes (only if peer shared needs)
  const give = peerNeeds
    ? myDups.filter(c => peerNeeds.indexOf(c) >= 0)
    : [];
  return {
    receive,
    give: give.length ? give : ["(Sin repetidos)"],
    otherUser: peer.u || "amigo",
    otherName: peer.dn || (peer.u ? `@${peer.u}` : "Amigo"),
    peerSharedNeeds: !!peerNeeds,
    real: true,
  };
}
function screenSwap(){
  const data = S.swapPeer ? buildSwapDataFromPeer(S.swapPeer) : buildSwapData();
  const selR = S.params.selR || [];
  const selG = S.params.selG || [];

  const stickerCell = (code, selected, onClick, from) => {
    const p = parseCode(code);
    const em = p ? (p.sticker.type==="logo"?"🛡":p.sticker.type==="team"?"👥":p.sticker.type==="special"?p.group.emoji:p.group.emoji) : "?";
    return `<div class="swap-sticker tap ${selected?'selected':''}" onclick="${onClick}" ${from?`data-from="${from}"`:``}>
      <div class="code">${esc(code)}</div>
      <div class="em">${em}</div>
    </div>`;
  };

  const noReceive = data.receive.length === 0;
  const noGive = data.give[0] === "(Sin repetidos)" || data.give.length === 0;
  const peerSharedNeeds = data.peerSharedNeeds !== false;

  const receiveHTML = noReceive
    ? `<div style="grid-column:1/-1; text-align:center; padding:20px; color:var(--text-muted); font-size:13px;">Tu amigo no tiene repetidas que te sirvan.</div>`
    : data.receive.map(c => stickerCell(c, selR.indexOf(c)>=0, `toggleSwapSel('R','${c}')`, 'R')).join("");
  const giveHTML = !peerSharedNeeds
    ? `<div style="grid-column:1/-1; text-align:center; padding:20px; color:var(--text-muted); font-size:13px;">Tu amigo no compartió sus faltantes en el QR.</div>`
    : noGive
      ? `<div style="grid-column:1/-1; text-align:center; padding:20px; color:var(--text-muted); font-size:13px;">No tienes repetidas que tu amigo necesite.</div>`
      : data.give.map(c => stickerCell(c, selG.indexOf(c)>=0, `toggleSwapSel('G','${c}')`, 'G')).join("");

  const canConfirm = selR.length > 0 || selG.length > 0;

  return `
    ${topBar(`Swap con @${data.otherUser}`, true, true, { showSettings: true })}
    <div class="body">
      <div style="padding:12px 16px;">
        <div style="font-size:13px; color:var(--text); line-height:1.5;">
          <b>${esc(data.otherName)}</b> tiene <b>${data.receive.length}</b> stickers que necesitas. Tú tienes <b>${noGive?0:data.give.length}</b> que él/ella necesita.
        </div>
        ${data.real ? `<div style="margin-top:8px; font-size:11px; color:var(--green); font-weight:700;">● En vivo · datos del QR escaneado</div>` : ``}
      </div>

      <div class="swap-section">
        <div class="title">
          <h3>Recibes</h3>
          <div class="cnt">(${selR.length}/${data.receive.length})</div>
        </div>
        <div class="swap-grid">${receiveHTML}</div>
      </div>

      <div class="swap-section" style="padding-top:0;">
        <div class="title">
          <h3>Das</h3>
          <div class="cnt">(${selG.length}/${noGive?0:data.give.length})</div>
        </div>
        <div class="swap-grid">${giveHTML}</div>
      </div>
    </div>
    <div class="footer-bar">
      <button class="btn primary tap" ${canConfirm?'':'disabled'} onclick="confirmSwap()">Confirmar trade (${selR.length} × ${selG.length})</button>
    </div>
    ${bottomNav()}`;
}
function toggleSwapSel(kind, code){
  if(kind==="R"){ const arr = (S.params.selR||[]).slice(); const i = arr.indexOf(code); if(i>=0) arr.splice(i,1); else arr.push(code); S.params.selR = arr; }
  else { const arr = (S.params.selG||[]).slice(); const i = arr.indexOf(code); if(i>=0) arr.splice(i,1); else arr.push(code); S.params.selG = arr; }
  render();
}
function confirmSwap(){
  const otherUser = (S.swapPeer && S.swapPeer.u) || (typeof MOCK_FRIEND !== 'undefined' ? MOCK_FRIEND.username : 'amigo');
  S.ui.modal = "swapConfirm";
  S.ui.modalData = {
    receive: S.params.selR||[],
    give: S.params.selG||[],
    otherUser,
    real: !!S.swapPeer,
  };
  renderModal();
}
async function finalizeSwap(){
  try {
    const receive = S.ui.modalData.receive || [];
    const give = S.ui.modalData.give || [];
    const isReal = !!S.ui.modalData.real;
    const otherUser = S.ui.modalData.otherUser || "amigo";

    receive.forEach(code => { const p = parseCode(code); if(!p) return; if(!S.album[p.gid]) S.album[p.gid] = {}; const cur = S.album[p.gid][p.n] || {owned:0}; S.album[p.gid][p.n] = { owned: cur.owned + 1 }; });
    give.forEach(code => { const p = parseCode(code); if(!p) return; const cur = (S.album[p.gid]||{})[p.n] || {owned:0}; if(cur.owned > 0){ if(!S.album[p.gid]) S.album[p.gid] = {}; S.album[p.gid][p.n] = { owned: cur.owned - 1 }; if(S.album[p.gid][p.n].owned===0) delete S.album[p.gid][p.n]; } });
    if(receive.length > 0 || give.length > 0) S.swapsCount = (S.swapsCount||0) + 1;
    recordAlbumSnapshot();
    closeModal();

    if(isReal && (receive.length > 0 || give.length > 0)){
      // Try live sync via Supabase first. If it succeeds, the offerer's app
      // will apply the swap automatically and we skip the receipt-QR step.
      let pushed = false;
      if(isSupabaseConfigured()){
        try {
          await pushSwap({
            offerer_user: otherUser,
            scanner_user: S.user.username || "anon",
            scanner_name: S.user.name || "",
            took: receive,   // I took these from the offerer
            gave: give,      // I gave these to the offerer
          });
          pushed = true;
        } catch(err){
          captureException(err, { tags: { mutation: "finalizeSwap.pushSwap" } });
          // fall through to receipt QR fallback
        }
      }

      S.swapPeer = null;
      S.params = {};

      if(pushed){
        S.swapReceipt = null;
        persist();
        toast(`Swap enviado a @${otherUser} · +${receive.length} / -${give.length}`);
        reset('album');
        return;
      }

      // Fallback: produce a receipt QR for the peer to scan manually.
      S.swapReceipt = {
        payload: buildReceiptState(receive, give),
        peer: otherUser,
      };
      persist();
      go('swap-receipt');
      return;
    }

    toast(`Swap confirmado · +${receive.length} / -${give.length}`);
    reset('album');
  } catch(err){
    handleMutationError("finalizeSwap", err);
  }
}

function screenSwapReceipt(){
  const r = S.swapReceipt;
  if(!r){
    setTimeout(() => reset('album'), 0);
    return `${topBar("Swap", true, true)}<div class="body"></div>${bottomNav()}`;
  }
  let payloadText = "";
  let payloadErr = "";
  try { payloadText = encodeSwapReceipt(r.payload); }
  catch(err){ payloadErr = err && err.message ? err.message : "Error"; console.error("[qr-receipt] encode failed", err); }
  const took = r.payload.took || [];
  const gave = r.payload.gave || [];

  return `
    ${topBar("Swap completado", true, true)}
    <div class="body">
      <div style="padding:14px 14px 0;">
        <div style="background: linear-gradient(135deg, var(--green), var(--ink-fixed)); border-radius:20px; padding:18px; color:#fff;">
          <div class="label" style="color:rgba(255,255,255,.75);">¡LISTO! TU ÁLBUM YA SE ACTUALIZÓ</div>
          <div class="disp" style="font-size:18px; margin-top:6px;">+${took.length} recibidas · -${gave.length} entregadas</div>
          <div style="font-size:12px; opacity:.85; margin-top:6px;">Falta que <b>@${esc(r.peer)}</b> escanee este recibo para que su álbum también se actualice.</div>
        </div>
      </div>

      <div class="qr-card" style="margin-top:14px;">
        <div class="label">RECIBO PARA @${esc(r.peer)}</div>
        <div class="qr-stage">
          <div class="qr-svg-wrap" id="qr-receipt-wrap">
            <div id="qr-receipt-target" class="qr-target">
              <div class="qr-loading">${esc(payloadErr || "Generando QR…")}</div>
            </div>
          </div>
        </div>
        <div class="qr-hint">
          Pídele a tu amigo abrir <b>QR · Escanear</b> y apuntar a este recibo.
        </div>
        <div class="qr-actions one">
          <button class="btn ghost tap sm" onclick="copyText(${JSON.stringify(payloadText)})">Copiar código</button>
        </div>
      </div>

      ${took.length > 0 ? `
        <div class="shop-section-title">RECIBISTE</div>
        <div style="margin: 0 14px; display:flex; flex-wrap:wrap; gap:6px;">
          ${took.map(c=>`<div class="chip" style="background:var(--green); color:#fff; border-color:transparent;">${esc(c)}</div>`).join("")}
        </div>
      ` : ``}
      ${gave.length > 0 ? `
        <div class="shop-section-title">DISTE</div>
        <div style="margin: 0 14px; display:flex; flex-wrap:wrap; gap:6px;">
          ${gave.map(c=>`<div class="chip" style="background:var(--red); color:#fff; border-color:transparent;">${esc(c)}</div>`).join("")}
        </div>
      ` : ``}

      <div style="padding: 18px 14px 24px;">
        <button class="btn primary tap" style="width:100%;" onclick="dismissSwapReceipt()">Listo</button>
      </div>
    </div>
    ${bottomNav()}`;
}
async function renderReceiptQR(){
  const target = document.getElementById("qr-receipt-target");
  if(!target || !S.swapReceipt) return;
  const showError = (msg) => {
    target.innerHTML = `<div style="font-size:11px; color:var(--text-muted); text-align:center; padding:20px;">${esc(msg)}</div>`;
  };
  let text;
  try { text = encodeSwapReceipt(S.swapReceipt.payload); }
  catch(err){
    console.error("[qr-receipt] encode failed", err);
    showError("No se pudo construir el recibo: " + (err && err.message ? err.message : "error"));
    return;
  }
  try {
    await renderQRSvg(target, text, { size: 320, errorCorrectionLevel: "L" });
  } catch(err){
    console.error("[qr-receipt] render failed", err, "len:", text.length);
    if(err && /too big|version/i.test(String(err.message||""))){
      showError("Recibo demasiado grande (" + text.length + " chars). Usa Copiar código.");
    } else {
      showError("Error al dibujar QR: " + (err && err.message ? err.message : "desconocido"));
    }
  }
}
function dismissSwapReceipt(){
  S.swapReceipt = null;
  persist();
  reset('album');
}

/* ---------- MY PANINI CREATE (Wizard 5 etapas) ---------- */
const MP_STEPS = 5;
const MP_STEP_TITLES = {1:"Tipo de carta",2:"País",3:"Foto",4:"Quitar fondo",5:"Detalles y preview"};

function mpResetWizard(){
  S.myPanini = JSON.parse(JSON.stringify(defaultState.myPanini));
}
function mpStepValid(step){
  const mp = S.myPanini;
  if(step===1) return !!mp.cardType;
  if(step===2) return !!(mp.country && mp.country.code);
  if(step===3) return !!mp.originalPhoto;
  if(step===4) return !!mp.processedPhoto;
  if(step===5){
    const f = mp.fields;
    const okBirth = !!f.birthDate && new Date(f.birthDate) <= new Date();
    return f.name.trim().length>0 && okBirth && Number(f.heightCm)>0 && Number(f.weightKg)>0 && f.team.trim().length>0;
  }
  return false;
}
function mpNext(){
  const mp = S.myPanini;
  if(!mpStepValid(mp.step)){ toast("Completa este paso para continuar"); return; }
  if(mp.step < MP_STEPS){ mp.step += 1; render(); }
  else { mpComplete(); }
}
function mpPrev(){
  const mp = S.myPanini;
  if(mp.step > 1){
    // Step 5 → 3 when bg-removal was skipped, so the user lands back on
    // the photo decision card without a one-tap detour through step 4.
    if(mp.step === 5 && !mp.backgroundRemoved) mp.step = 3;
    else mp.step -= 1;
    render();
  }
  else { mpExitWizard(); }
}
function mpGotoStep(step){
  const mp = S.myPanini;
  if(step <= mp.step){ mp.step = step; render(); }
}
// Header back arrow / step-1 Cancelar: confirm if the user has typed/picked
// anything before nuking their progress. Empty wizard exits silently.
function mpExitWizard(){
  const mp = S.myPanini;
  const hasData = !!(mp.cardType || (mp.country && mp.country.code) || mp.originalPhoto || mp.processedPhoto || (mp.fields && (mp.fields.name || mp.fields.team)));
  if(hasData && !window.confirm("¿Salir del wizard? Tu progreso se pierde.")) return;
  if(hasData) mpResetWizard();
  back();
}
function mpSetType(t){
  S.myPanini.cardType = t;
  // Auto-advance from the type step. Pure single-choice → no need for the
  // user to also tap "Siguiente". Only advances when we're actually ON
  // step 1 (so re-selecting from a later step via the stepper still works).
  if(S.myPanini.step === 1 && S.myPanini.step < MP_STEPS) S.myPanini.step += 1;
  render();
}
function mpSetCountry(code){
  const t = TEAMS.find(x=>x.code===code);
  if(!t) return;
  S.myPanini.country = { code:t.code, name:t.name, flag:t.flag, group:t.group };
  S.myPanini.countryOpen = false;
  S.myPanini.countryQuery = "";
  // Auto-advance from the country step (same logic as mpSetType).
  if(S.myPanini.step === 2 && S.myPanini.step < MP_STEPS) S.myPanini.step += 1;
  render();
}
function mpFilterCountries(q){
  S.myPanini.countryQuery = q;
  const list = document.getElementById("mp-country-list");
  if(!list) return;
  list.innerHTML = countryListItemsHTML(q.toLowerCase());
}
// Reusable country picker — full-width direct list (no dropdown). Sorted
// alphabetically by Spanish name. Each row: flag + name + code with a
// 56px tap target. The currently selected country gets a green tint and
// checkmark so returning via "← Atrás" shows the prior choice.
function countryListItemsHTML(ql){
  const sorted = TEAMS.slice().sort((a, b) => a.name.localeCompare(b.name, 'es'));
  const filtered = sorted.filter(t => !ql || t.name.toLowerCase().includes(ql) || t.code.toLowerCase().includes(ql));
  if(filtered.length === 0) return `<div class="empty">Sin resultados</div>`;
  const sel = (S.myPanini.country && S.myPanini.country.code) || null;
  return filtered.map(t => {
    const isSel = sel === t.code;
    return `
      <div class="opt ${isSel?'selected':''}" role="option" aria-selected="${isSel}" tabindex="0" onclick="mpSetCountry('${t.code}')" onkeydown="if(event.key==='Enter'){mpSetCountry('${t.code}')}">
        <span class="flag" aria-hidden="true">${t.flag}</span>
        <span class="name">${esc(t.name)}</span>
        <span class="code">${esc(t.code)}</span>
        ${isSel ? `<span class="check" aria-hidden="true">✓</span>` : ``}
      </div>`;
  }).join("");
}

function mpHandlePhoto(ev){
  const f = (ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0]) || (ev.target && ev.target.files && ev.target.files[0]);
  if(!f) return;
  const allowed = ["image/png","image/jpeg","image/webp"];
  if(allowed.indexOf(f.type) === -1){ S.myPanini.uploadError = "Formato no soportado. Usa PNG, JPG o WEBP."; render(); return; }
  if(f.size > 10*1024*1024){ S.myPanini.uploadError = "Archivo demasiado grande (máx 10MB)."; render(); return; }
  S.myPanini.uploadError = null;
  const r = new FileReader();
  r.onload = (e) => {
    S.myPanini.originalPhoto = e.target.result;
    // Don't auto-run bg removal here. Step 3 now lets the user pick
    // between "Quitar fondo con IA" (advance to step 4 + run) and
    // "Continuar con original" (skip step 4, jump to step 5).
    S.myPanini.processedPhoto = null;
    S.myPanini.bgRemovalError = null;
    S.myPanini.backgroundRemoved = false;
    render();
  };
  r.readAsDataURL(f);
}
function mpHandleDrop(ev){ ev.preventDefault(); ev.stopPropagation(); mpHandlePhoto(ev); }
function mpHandleDragOver(ev){ ev.preventDefault(); ev.stopPropagation(); }
// "Cámara" button: feature-detect a videoinput device. Phones short-circuit
// past the enumerateDevices call and just trigger the capture input. Desktops
// without a camera get a toast + fallback to the regular file picker so the
// click never feels broken.
async function mpCameraOpen(){
  const cam = document.getElementById('mp-input-camera');
  const file = document.getElementById('mp-input-file');
  if(!cam) return;
  let hasCamera = true;
  try {
    if(navigator.mediaDevices && navigator.mediaDevices.enumerateDevices){
      const devices = await navigator.mediaDevices.enumerateDevices();
      hasCamera = devices.some((d) => d.kind === 'videoinput');
    }
  } catch(_){ /* unknown — assume yes, the OS picker will still cope */ }
  if(!hasCamera){
    toast("Tu dispositivo no tiene cámara disponible");
    if(file) file.click();
    return;
  }
  cam.click();
}
function mpClearPhoto(){
  S.myPanini.originalPhoto = null;
  S.myPanini.processedPhoto = null;
  S.myPanini.bgRemovalError = null;
  S.myPanini.bgProgress = 0;
  S.myPanini.bgProgressKey = "";
  render();
}

// Pin the model assets to a known-good URL so the publicPath is visible,
// loggable, and easy to swap if staticimgly ever goes down. Must match the
// installed @imgly/background-removal version (the lib expects the data
// package to be hosted under the same version path). Note: jsDelivr is NOT
// a viable mirror — @imgly/background-removal-data on npm tops out at
// 1.4.5, while the lib at 1.7.0 looks for 1.7.0-pinned paths.
const IMGLY_PUBLIC_PATH = "https://staticimgly.com/@imgly/background-removal-data/1.7.0/dist/";

let _imglyMod = null;
async function _loadImgly(){
  if(!_imglyMod) _imglyMod = await import('@imgly/background-removal');
  return _imglyMod;
}
function _dataUrlToBlob(dataURL){
  return fetch(dataURL).then(r => r.blob());
}
function _blobToDataURL(blob){
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error || new Error("FileReader error"));
    r.readAsDataURL(blob);
  });
}

let _bgRemovalSeq = 0;
async function mpRunBgRemoval(input, _retryCount = 0){
  const mp = S.myPanini;
  if(!mp.originalPhoto && !input) return;
  const seq = ++_bgRemovalSeq;
  mp.bgRemovalLoading = true;
  mp.bgRemovalError = null;
  mp.processedPhoto = null;
  mp.bgProgress = 0;
  mp.bgProgressKey = "Cargando modelo…";
  render();

  console.info("[mp-bg-removal] start", { publicPath: IMGLY_PUBLIC_PATH, retry: _retryCount });

  // Smooth heartbeat so the bar never appears stuck. imgly only fires
  // progress events as bytes arrive, and resets the per-file ratio to 0
  // each time a new asset starts downloading — that's why users saw
  // "Cargando modelo… 0%" for 5+ seconds. We tick monotonically toward
  // 0.92 over ~25 s (typical first-run model fetch), and let real progress
  // events override only when they exceed the current value.
  const startTime = Date.now();
  const HEARTBEAT_TARGET = 0.92;
  const HEARTBEAT_DURATION_MS = 25000;
  const heartbeatId = setInterval(() => {
    if(seq !== _bgRemovalSeq){ clearInterval(heartbeatId); return; }
    const elapsed = Date.now() - startTime;
    const fakePct = Math.min(HEARTBEAT_TARGET, (elapsed / HEARTBEAT_DURATION_MS) * HEARTBEAT_TARGET);
    if(fakePct > (mp.bgProgress || 0)){
      mp.bgProgress = fakePct;
      _renderBgProgressUI();
    }
  }, 250);

  let timeoutId = 0;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("timeout")), 30000);
  });

  const stopAux = () => { clearInterval(heartbeatId); clearTimeout(timeoutId); };

  try {
    let blob = input instanceof Blob ? input : await _dataUrlToBlob(mp.originalPhoto);
    const { removeBackground } = await _loadImgly();
    if(seq !== _bgRemovalSeq){ stopAux(); return; }

    const work = removeBackground(blob, {
      publicPath: IMGLY_PUBLIC_PATH,
      output: { format: "image/png" },
      progress: (key, current, total) => {
        if(seq !== _bgRemovalSeq) return;
        const realPct = total > 0 ? Math.min(1, current / total) : 0;
        // Monotonic: never let a per-file reset (current=0 on a new asset)
        // visually rewind the bar.
        if(realPct > (mp.bgProgress || 0)) mp.bgProgress = realPct;
        mp.bgProgressKey = _bgProgressLabel(key);
        _renderBgProgressUI();
      },
    });

    const outBlob = await Promise.race([work, timeoutPromise]);
    stopAux();
    if(seq !== _bgRemovalSeq) return;

    const dataURL = await _blobToDataURL(outBlob);
    if(seq !== _bgRemovalSeq) return;

    mp.processedPhoto = dataURL;
    mp.backgroundRemoved = true;
    mp.bgRemovalLoading = false;
    mp.bgProgress = 1;
    mp.bgProgressKey = "Listo";
    console.info("[mp-bg-removal] done in", Date.now() - startTime, "ms");
    render();
  } catch(err){
    stopAux();
    if(seq !== _bgRemovalSeq) return;
    const msg = String((err && err.message) || err || "");
    console.error("[mp-bg-removal] failed", { msg, retry: _retryCount, err });

    // One automatic retry on transient network failures. Timeouts already
    // burned 30 s — retrying just doubles the wait, so the user gets the
    // error UI immediately and can use the explicit Reintentar button.
    const isTransient = !/timeout/i.test(msg) &&
      /failed to fetch|networkerror|err_|resource metadata|aborted/i.test(msg);
    if(isTransient && _retryCount < 1){
      console.warn("[mp-bg-removal] auto-retrying once after transient error");
      return mpRunBgRemoval(input, _retryCount + 1);
    }

    captureException(err, { tags: { mutation: "mpRunBgRemoval" } });
    mp.bgRemovalLoading = false;
    // Specific message per failure mode so the user understands what to do.
    if(/timeout/i.test(msg)){
      mp.bgRemovalError = "El modelo tardó demasiado. Toca Reintentar.";
    } else if(/csp|blocked|ERR_/i.test(msg) || /failed to fetch/i.test(msg) || /networkerror/i.test(msg)){
      mp.bgRemovalError = "No se pudo descargar el modelo. Revisa tu conexión y reintenta.";
    } else if(/resource metadata/i.test(msg)){
      mp.bgRemovalError = "El servidor del modelo no respondió. Reintenta en un momento.";
    } else {
      mp.bgRemovalError = "No se pudo procesar la foto. Intenta otra foto o usa la original.";
    }
    mp.bgProgress = 0;
    mp.bgProgressKey = "";
    // Do NOT silently fall back to originalPhoto — that hid the failure and
    // made the user think BG removal "did nothing" because the comparison
    // showed identical images. Leave processedPhoto null so step 4 renders
    // the error UI with Reintentar / Usar original as explicit choices.
    mp.processedPhoto = null;
    toast(mp.bgRemovalError);
    render();
  }
}
function _bgProgressLabel(key){
  if(!key) return "Procesando…";
  const k = String(key).toLowerCase();
  if(k.includes("fetch") || k.includes("download")) return "Descargando modelo…";
  if(k.includes("compute") || k.includes("inference")) return "Recortando silueta…";
  if(k.includes("encode")) return "Generando PNG…";
  if(k.includes("decode")) return "Decodificando imagen…";
  return "Procesando…";
}
function _renderBgProgressUI(){
  const mp = S.myPanini;
  const bar = document.getElementById("mp-bg-bar");
  const pct = document.getElementById("mp-bg-pct");
  const lbl = document.getElementById("mp-bg-lbl");
  const p = Math.round((mp.bgProgress||0) * 100);
  if(bar) bar.style.width = p + "%";
  if(pct) pct.textContent = p + "%";
  if(lbl) lbl.textContent = mp.bgProgressKey || "Procesando…";
}
function mpUseOriginal(){
  _bgRemovalSeq++;
  S.myPanini.processedPhoto = S.myPanini.originalPhoto;
  S.myPanini.backgroundRemoved = false;
  S.myPanini.bgRemovalLoading = false;
  S.myPanini.bgRemovalError = null;
  S.myPanini.bgProgress = 0;
  S.myPanini.bgProgressKey = "";
  render();
}
// Step 3 primary: user accepted "Quitar fondo con IA". Advances to step 4
// and kicks off the removal. The previous flow auto-ran removal on photo
// upload; now the user explicitly opts in.
function mpRequestBgRemoval(){
  const mp = S.myPanini;
  if(!mp.originalPhoto) return;
  if(mp.step < 4) mp.step = 4;
  render();
  mpRunBgRemoval();
}
// Skip the bg-removal step. Called from:
//   • Step 3 secondary button "Continuar con original" — jumps 3 → 5
//   • Step 4 "Saltar este paso →" while loading — cancels and goes 4 → 5
//   • Anti-trap fall-back when the model fetch hangs
// In every case we mark backgroundRemoved=false so step 5 knows to use the
// untouched photo and "← Atrás" from 5 returns to 3 (skipping 4).
function mpSkipBgStep(){
  _bgRemovalSeq++;
  const mp = S.myPanini;
  mp.processedPhoto = mp.originalPhoto;
  mp.backgroundRemoved = false;
  mp.bgRemovalLoading = false;
  mp.bgRemovalError = null;
  mp.bgProgress = 0;
  mp.bgProgressKey = "";
  if(mp.step < MP_STEPS) mp.step = MP_STEPS;
  render();
}
function mpRetryBgRemoval(){
  if(S.myPanini.originalPhoto) mpRunBgRemoval();
}
function mpSetField(key, val){
  if(key==="heightCm" || key==="weightKg"){
    S.myPanini.fields[key] = val === "" ? null : Number(val);
  } else {
    S.myPanini.fields[key] = val;
  }
  render();
}
function mpSetOffsetY(val){ S.myPanini.photoOffsetY = Math.max(-100, Math.min(100, Number(val)||0)); render(); }
function mpNudgeOffset(delta){ mpSetOffsetY((S.myPanini.photoOffsetY||0) + delta); }

function mpComplete(){
  try {
    if(!mpStepValid(5)){ toast("Faltan datos por completar"); return; }
    S.cart["MY-PANINI-"+Date.now()] = 1;
    toast("My Panini agregado al carrito");
    mpResetWizard();
    go('carrito');
  } catch(err){
    handleMutationError("mpComplete", err);
  }
}

function mpStepperBar(){
  const mp = S.myPanini;
  const cur = mp.step;
  // Step 4 reads as "skipped" once the user is past it without ever having
  // run the AI removal. Renders gray with a dash, not a green check.
  const skipped4 = cur > 4 && !mp.backgroundRemoved;
  let html = '<div class="mp-stepper" role="progressbar" aria-valuemin="1" aria-valuemax="'+MP_STEPS+'" aria-valuenow="'+cur+'">';
  for(let i=1;i<=MP_STEPS;i++){
    let cls;
    let label;
    if(i === 4 && skipped4){
      cls = "st skipped"; label = "–";
    } else if(i < cur){
      cls = "st done";    label = "✓";
    } else if(i === cur){
      cls = "st active";  label = String(i);
    } else {
      cls = "st";         label = String(i);
    }
    html += `<div class="${cls}" onclick="mpGotoStep(${i})" role="button" aria-label="Paso ${i}">${label}</div>`;
    if(i < MP_STEPS){
      // Bar 3-4 stays gray when step 4 was skipped — visual cue that the
      // path bypassed it. Bar 4-5 is "done" (the user did reach 5).
      const barDone = i < cur && !(i === 3 && skipped4);
      html += `<div class="bar ${barDone ? 'done' : ''}"></div>`;
    }
  }
  html += '</div>';
  return html;
}

function mpStep1(){
  const t = S.myPanini.cardType;
  return `
    <div class="form-group" style="padding:0 14px;">
      <div class="form-title">¿Qué quieres crear?</div>
    </div>
    <div class="mp-type-grid">
      <button class="mp-type-card tap ${t==='normal'?'selected':''}" onclick="mpSetType('normal')" aria-pressed="${t==='normal'}">
        <div class="ico">🃏</div>
        <div class="t">Carta normal</div>
        <div class="s">Estampa estilo Panini con marco oficial</div>
      </button>
      <button class="mp-type-card tap ${t==='extra'?'selected':''}" onclick="mpSetType('extra')" aria-pressed="${t==='extra'}">
        <div class="ico">✨</div>
        <div class="t">Extra sticker</div>
        <div class="s">Sticker holográfico edición especial</div>
      </button>
    </div>`;
}
function mpStep2(){
  const mp = S.myPanini;
  const ql = (mp.countryQuery || "").toLowerCase();
  return `
    <div class="mp-country-screen">
      <div class="mp-country-search-bar">
        <span aria-hidden="true">🔍</span>
        <input id="mp-country-search" type="text" placeholder="Buscar país…" value="${esc(mp.countryQuery)}" oninput="mpFilterCountries(this.value)" autocomplete="off" autocapitalize="off" />
      </div>
      <div class="mp-country-list mp-country-list--full" id="mp-country-list" role="listbox" aria-label="Países del Mundial 2026">
        ${countryListItemsHTML(ql)}
      </div>
    </div>`;
}
function mpStep3(){
  const mp = S.myPanini;
  const hasPhoto = !!mp.originalPhoto;
  return `
    <div style="padding:14px;">
      <div class="form-title">Sube tu foto</div>
      <div class="mp-drop ${hasPhoto?'has-file':''}" ondragover="mpHandleDragOver(event)" ondrop="mpHandleDrop(event)">
        ${hasPhoto ? `
          <div class="square"><img src="${mp.originalPhoto}" alt="Foto subida" /></div>
          <div class="actions">
            <label class="btn ghost tap" style="cursor:pointer; height:38px; padding:0 14px;">
              Cambiar foto
              <input type="file" accept="image/png,image/jpeg,image/webp" style="display:none;" onchange="mpHandlePhoto(event)" />
            </label>
            <button class="btn ghost tap" style="height:38px; padding:0 14px;" onclick="mpClearPhoto()">Quitar</button>
          </div>
        ` : `
          <div class="em">📸</div>
          <div class="t">Arrastra una foto o selecciónala</div>
          <div class="s">PNG, JPG o WEBP · máx 8MB</div>
          <div class="actions">
            <label class="btn primary tap" for="mp-input-file" style="cursor:pointer; height:42px; padding:0 18px;">
              Seleccionar archivo
            </label>
            <button type="button" class="btn ghost tap" style="height:42px; padding:0 14px;" onclick="mpCameraOpen()">
              📷 Cámara
            </button>
            <input id="mp-input-file" type="file" accept="image/png,image/jpeg,image/webp" style="display:none;" onchange="mpHandlePhoto(event)" />
            <input id="mp-input-camera" type="file" accept="image/*" capture="user" style="display:none;" onchange="mpHandlePhoto(event)" />
          </div>
        `}
        ${mp.uploadError ? `<div class="mp-error">${esc(mp.uploadError)}</div>` : ``}
      </div>
      ${hasPhoto ? `
        <div class="mp-photo-decision">
          <button class="btn primary tap" onclick="mpRequestBgRemoval()">Quitar fondo con IA</button>
          <button class="btn ghost tap" onclick="mpSkipBgStep()">Continuar con original</button>
          <div class="mp-photo-decision-hint">El recorte por IA tarda unos segundos. Puedes seguir con la foto original si prefieres.</div>
        </div>
      ` : ``}
    </div>`;
}
function mpStep4(){
  const mp = S.myPanini;
  const pct = Math.round((mp.bgProgress||0) * 100);
  // Escape route: ALWAYS show Saltar/Volver buttons under the spinner so the
  // user is never trapped if the model fetch hangs. mpSkipBgStep cancels
  // any in-flight task and advances to step 5 with the original photo.
  const escapeButtons = `
    <div style="display:flex; gap:8px; padding:12px 14px 0;">
      <button class="btn ghost tap" style="flex:1; height:40px;" onclick="mpPrev()">← Volver</button>
      <button class="btn ghost tap" style="flex:1; height:40px;" onclick="mpSkipBgStep()">Saltar este paso →</button>
    </div>`;
  return `
    <div style="padding:14px 0;">
      <div class="form-title" style="padding:0 14px 6px;">Removiendo fondo con IA</div>
      ${mp.bgRemovalLoading ? `
        <div style="padding:0 14px;">
          <div class="form-card" style="gap:12px;">
            <div style="display:flex; align-items:center; gap:10px;">
              <div class="mp-spin" aria-hidden="true"></div>
              <div id="mp-bg-lbl" style="flex:1; font-size:13px; color:var(--text); font-weight:700;">${esc(mp.bgProgressKey || "Procesando…")}</div>
              <div id="mp-bg-pct" class="mono" style="font-size:12px; font-weight:800; color:var(--green);">${pct}%</div>
            </div>
            <div class="mp-bg-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}">
              <div id="mp-bg-bar" class="mp-bg-fill" style="width:${pct}%;"></div>
            </div>
            <div style="font-size:11px; color:var(--text-muted); text-align:center;">Esto puede tardar 5–15 s. Primera vez descarga el modelo (~10 MB).</div>
            ${mp.originalPhoto ? `<div class="mp-bg-preview"><img src="${mp.originalPhoto}" alt="Original" /></div>` : ``}
          </div>
        </div>
        ${escapeButtons}
        <div style="font-size:11px; color:var(--text-muted); text-align:center; padding: 8px 14px 0;">
          ¿Tarda demasiado? Puedes saltar este paso o volver a subir otra foto.
        </div>
      ` : !mp.processedPhoto ? `
        <div style="padding:0 14px;">
          <div class="form-card" style="text-align:center; gap:10px;">
            <div style="font-size:13px; color:var(--text-muted);">${mp.bgRemovalError ? esc(mp.bgRemovalError) : "Toca el botón para limpiar el fondo de tu foto."}</div>
            <button class="btn primary tap" style="height:42px;" onclick="mpRetryBgRemoval()">${mp.bgRemovalError ? '↻ Reintentar' : '✂️ Remover fondo'}</button>
            ${mp.bgRemovalError ? `<div class="mp-error">Sin recorte. Puedes saltar este paso o volver a subir otra foto.</div>` : ``}
          </div>
        </div>
        ${mp.bgRemovalError ? escapeButtons : ``}
      ` : `
        <div class="mp-bg-compare">
          <div class="col">
            <div class="lbl">Original</div>
            <div class="img-wrap"><img src="${mp.originalPhoto}" alt="Original"/></div>
          </div>
          <div class="col">
            <div class="lbl">Sin fondo</div>
            <div class="img-wrap"><img src="${mp.processedPhoto}" alt="Sin fondo"/></div>
          </div>
        </div>
        <div style="display:flex; gap:8px; padding:12px 14px;">
          <button class="btn ghost tap" style="flex:1; height:40px;" onclick="mpRetryBgRemoval()">↻ Reintentar</button>
          <button class="btn ghost tap" style="flex:1; height:40px;" onclick="mpUseOriginal()">Usar original</button>
        </div>
      `}
    </div>`;
}
function mpStep5(){
  const mp = S.myPanini;
  const f = mp.fields;
  const country = mp.country || { flag:"🌐", name:"País" };
  const photo = mp.processedPhoto || mp.originalPhoto;
  const isExtra = mp.cardType === "extra";
  return `
    <div style="padding:14px;">
      <div class="form-title" style="padding-bottom:8px;">Preview</div>
      <div class="mp-preview ${isExtra?'extra':''}">
        ${photo ? `<img class="mp-photo" src="${photo}" alt="" style="object-position: 50% ${50 + (mp.photoOffsetY||0)/2}%;"/>` : "📸"}
        <div class="mp-bottom">${esc((f.name||"TU NOMBRE").toUpperCase())} · ${esc(country.flag)} ${esc(country.name)}</div>
      </div>

      <div class="form-group">
        <div class="form-title">Mover foto</div>
        <div class="form-card">
          <div class="mp-slider-row">
            <button class="mp-arrow-btn tap" onclick="mpNudgeOffset(-10)" aria-label="Subir foto">▲</button>
            <input type="range" min="-100" max="100" step="1" value="${mp.photoOffsetY||0}" oninput="mpSetOffsetY(this.value)" aria-label="Posición vertical de la foto"/>
            <button class="mp-arrow-btn tap" onclick="mpNudgeOffset(10)" aria-label="Bajar foto">▼</button>
          </div>
        </div>
      </div>

      <div class="form-group">
        <div class="form-title">Datos del jugador</div>
        <div class="form-card">
          <div class="field">
            <div class="flbl">Nombre</div>
            <input maxlength="40" value="${esc(f.name)}" oninput="mpSetField('name', this.value)" placeholder="Pablo González" />
          </div>
          <div class="field">
            <div class="flbl">Fecha de nacimiento</div>
            <input type="date" value="${esc(f.birthDate)}" max="${new Date().toISOString().slice(0,10)}" oninput="mpSetField('birthDate', this.value)" />
          </div>
          <div style="display:flex; gap:8px;">
            <div class="field" style="flex:1;">
              <div class="flbl">Estatura (cm)</div>
              <input type="number" min="100" max="230" value="${f.heightCm==null?'':f.heightCm}" oninput="mpSetField('heightCm', this.value)" placeholder="178" />
            </div>
            <div class="field" style="flex:1;">
              <div class="flbl">Peso (kg)</div>
              <input type="number" min="30" max="200" value="${f.weightKg==null?'':f.weightKg}" oninput="mpSetField('weightKg', this.value)" placeholder="74" />
            </div>
          </div>
          <div class="field">
            <div class="flbl">Equipo</div>
            <input list="mp-teams-dl" value="${esc(f.team)}" oninput="mpSetField('team', this.value)" placeholder="Selección Mexicana" />
            <datalist id="mp-teams-dl">
              ${TEAMS.map(t=>`<option value="${esc(t.name)}">`).join("")}
            </datalist>
          </div>
        </div>
      </div>
    </div>`;
}

function screenMyPaniniCreate(){
  const mp = S.myPanini;
  const step = mp.step;
  const canNext = mpStepValid(step);
  const stepBody =
    step===1 ? mpStep1() :
    step===2 ? mpStep2() :
    step===3 ? mpStep3() :
    step===4 ? mpStep4() :
               mpStep5();
  const ctaLabel = step < MP_STEPS ? "Siguiente →" : "Guardar y agregar al carrito · $200";
  // Step 3 is the photo-decision card: the user picks "Quitar fondo con IA"
  // or "Continuar con original" inline, so the footer's "Siguiente →" would
  // be redundant. We hide it and let the back button stand alone.
  const hideNext = step === 3;
  return `
    ${topBar(MP_STEP_TITLES[step] || "Crea tu carta", true, false, { backHandler: "mpExitWizard()" })}
    ${mpStepperBar()}
    <div class="body body--mp-wizard">
      ${stepBody}
    </div>
    <div class="footer-bar">
      <div class="mp-wiz-nav" style="flex:1;">
        <button class="btn ghost tap" onclick="mpPrev()">${step===1?'Cancelar':'← Atrás'}</button>
        ${hideNext ? `` : `<button class="btn primary tap" onclick="mpNext()" ${canNext?'':'disabled'}>${ctaLabel}</button>`}
      </div>
    </div>
    ${bottomNav()}`;
}
/* ---------- PERFIL (POS REGISTRATION) ---------- */
function posSet(field, value){
  if(!S.user.pos) S.user.pos = { registered:false, name:"", type:"tienda", address:"", phone:"", hours:"", visible:true };
  S.user.pos[field] = value;
  persist();
}
function posSavePOS(){
  const p = S.user.pos || {};
  if(!p.name || !p.name.trim()){ toast("Falta el nombre del negocio"); return; }
  if(!p.address || !p.address.trim()){ toast("Falta la dirección"); return; }
  if(!p.phone || !p.phone.trim()){ toast("Falta el teléfono"); return; }
  S.user.pos.registered = true;
  persist();
  render();
  toast("Punto de venta registrado");
}
function posEditPOS(){
  if(S.user.pos) S.user.pos.registered = false;
  persist();
  render();
}

function screenPerfil(){
  ensureReferralShape();
  const code = (S.user.referralCode || "").trim().toUpperCase();
  const sum = S.referral?.summary;
  // Local ledger is the source of truth for spendable saldo (the backend
  // summary is a remote mirror folded into it via fetchReferralSummary).
  const balance = S.referral.balance || 0;
  const totalEarned = S.referral.totalEarned || 0;
  const events = (sum && Array.isArray(sum.events)) ? sum.events : [];
  const totalReferred = sum && typeof sum.totalReferred === "number" ? sum.totalReferred : 0;
  const ratePct = sum && typeof sum.events?.[0]?.rate === "number" ? Math.round(sum.events[0].rate * 100) : 10;
  return `
    ${topBar("Perfil", false, true, { showSettings: true })}
    <div class="body">
      <div class="perfil-share">
        <div class="perfil-share-hero">
          <div class="perfil-share-headline">${esc(REFERRAL_HEADLINE)}</div>
          <div class="perfil-share-tagline">${esc(REFERRAL_TAGLINE)}</div>
        </div>
        <div class="perfil-share-eyebrow">COMPARTE TU CÓDIGO</div>
        <button class="perfil-share-code tap" onclick="copyText('${esc(code)}'); toast('Código copiado')" aria-label="Copiar código ${esc(code)}">${esc(code) || '—'}</button>
        <div class="perfil-share-actions">
          <button class="btn brand tap" onclick="copyText('${esc(code)}'); toast('Código copiado')">Copiar código</button>
          <button class="btn tap" style="background:var(--surface-2); color:var(--text);" onclick="sharePerfilLink()">Compartir</button>
        </div>
        <div class="perfil-share-copy">Tu amigo recibe ${fmt(WELCOME_CREDIT_AMOUNT)} de bienvenida. Tú ganas ${ratePct}% de su primera compra y de cada compra después.</div>
      </div>

      <div class="perfil-card">
        <div class="perfil-balance-row">
          <div class="perfil-balance-lbl">Saldo disponible</div>
          <div class="perfil-balance-val">${fmt(balance)}</div>
        </div>
        <div class="perfil-balance-sub">Ganado histórico ${fmt(totalEarned)}${events.length ? ` · ${events.length} ${events.length===1?'compra':'compras'} de tus referidos` : ''}</div>
        <div style="font-size:12px; color:var(--text-muted); margin-top:8px;">Úsalo en tu próxima compra (hasta el 100% del total). No es retirable en efectivo.</div>
        ${balance >= MIN_CREDIT_APPLY ? `
          <button class="btn brand tap" style="width:100%; margin-top:12px;" onclick="reset('tienda')">Usar ahora →</button>
        ` : ``}
      </div>

      <div class="shop-section-title">REFERIDOS RECIENTES</div>
      ${events.length === 0 ? `
        <div class="perfil-empty">
          <div class="t">Aún no tienes compras de referidos</div>
          <div class="s">Comparte tu link y empieza a ganar el ${ratePct}% por cada compra que hagan.</div>
        </div>
      ` : `
        <div class="perfil-events">
          ${events.map(e => `
            <div class="perfil-event">
              <div class="perfil-event-l">
                <div class="perfil-event-name">${esc(e.buyerName || 'Cliente')}</div>
                <div class="perfil-event-meta">Pedido ${esc(e.orderNumber)} · ${new Date(e.createdAt).toLocaleDateString('es-MX', {day:'numeric',month:'short'})}</div>
              </div>
              <div class="perfil-event-r">
                <div class="perfil-event-amt">+${fmt((e.commission || 0) + (e.firstPurchaseBonus || 0))}</div>
                <div class="perfil-event-base">${e.firstPurchaseBonus ? `bono +${fmt(e.firstPurchaseBonus)} · ` : ''}${ratePct}% de ${fmt(e.orderTotal)}</div>
              </div>
            </div>
          `).join("")}
        </div>
      `}
    </div>
    ${bottomNav()}`;
}

function _legacyScreenPerfilUnused(){
  const p = S.user.pos || { registered:false, name:"", type:"tienda", address:"", phone:"", hours:"", visible:true };
  const types = [
    { id:"tienda",       label:"Tienda física", icon:"🏪" },
    { id:"online",       label:"Online",        icon:"🌐" },
    { id:"distribuidor", label:"Distribuidor",  icon:"📦" },
  ];
  const typeLabel = (types.find(t => t.id === p.type) || types[0]).label;
  const typeIcon  = (types.find(t => t.id === p.type) || types[0]).icon;

  const registeredView = `
    <div style="padding:14px 14px 0;">
      <div style="background: linear-gradient(135deg, var(--green), var(--ink-fixed)); border-radius: 24px; padding: 20px; color:#fff; position:relative; overflow:hidden;">
        <div style="position:absolute; top:-40px; right:-40px; width:180px; height:180px; opacity:.15; border-radius:999px; background: radial-gradient(circle, transparent 60%, var(--gold) 61%, var(--gold) 63%, transparent 64%); pointer-events:none;"></div>
        <div class="label" style="color:rgba(255,255,255,.75);">PUNTO DE VENTA REGISTRADO</div>
        <div style="display:flex; align-items:center; gap:12px; margin-top:6px;">
          <div style="width:56px; height:56px; border-radius:999px; background:rgba(255,255,255,0.14); display:flex; align-items:center; justify-content:center; font-size:28px;">${typeIcon}</div>
          <div style="flex:1; min-width:0;">
            <div class="disp" style="font-size:18px; line-height:1.15;">${esc(p.name)}</div>
            <div style="font-size:11px; opacity:.85; margin-top:2px;">${esc(typeLabel)}</div>
          </div>
          <button class="tap" style="padding:8px 12px; border-radius:999px; background:rgba(255,255,255,.14); color:#fff; font-size:11px; font-weight:700;" onclick="posEditPOS()">Editar</button>
        </div>
      </div>
    </div>
    <div class="shop-section-title">DETALLES</div>
    <div class="section-list" style="margin-bottom:20px;">
      <div class="section-row">
        <div class="em">📍</div>
        <div class="body" style="text-align:left;"><div class="n">Dirección</div><div class="c">${esc(p.address)}</div></div>
      </div>
      <div class="section-row">
        <div class="em">📞</div>
        <div class="body" style="text-align:left;"><div class="n">Teléfono</div><div class="c">${esc(p.phone)}</div></div>
      </div>
      ${p.hours ? `<div class="section-row">
        <div class="em">🕒</div>
        <div class="body" style="text-align:left;"><div class="n">Horario</div><div class="c">${esc(p.hours)}</div></div>
      </div>` : ``}
      <div class="section-row">
        <div class="em">${p.visible ? '👁️' : '🙈'}</div>
        <div class="body" style="text-align:left;"><div class="n">Visibilidad</div><div class="c">${p.visible ? 'Visible en el directorio' : 'Oculto del directorio'}</div></div>
      </div>
    </div>
  `;

  const formView = `
    <div style="padding:14px 14px 0;">
      <div style="background: linear-gradient(135deg, var(--ink-fixed), #0f2a1e); border-radius: 24px; padding: 18px 18px 16px; color:#fff; position:relative; overflow:hidden;">
        <div style="position:absolute; top:-40px; right:-40px; width:180px; height:180px; opacity:.15; border-radius:999px; background: radial-gradient(circle, transparent 60%, var(--gold) 61%, var(--gold) 63%, transparent 64%); pointer-events:none;"></div>
        <div class="disp" style="font-size:18px;">Registra tu Punto de Venta</div>
        <div style="font-size:12px; opacity:.85; margin-top:6px;">Aparece en el directorio para que otros usuarios te encuentren cuando busquen sobres, álbumes o swaps cerca.</div>
      </div>
    </div>

    <div class="shop-section-title">TIPO DE NEGOCIO</div>
    <div style="margin: 0 14px;">
      <div class="theme-toggle" role="radiogroup" aria-label="Tipo de punto de venta">
        ${types.map(t => {
          const active = (p.type || "tienda") === t.id;
          return `<button class="tap${active?' active':''}" role="radio" aria-checked="${active}" onclick="posSet('type','${t.id}');render()"><span aria-hidden="true">${t.icon}</span><span>${esc(t.label)}</span></button>`;
        }).join("")}
      </div>
    </div>

    <div class="shop-section-title">DATOS DEL NEGOCIO</div>
    <div class="section-list" style="margin-bottom:14px; padding: 4px 12px;">
      <div class="field" style="padding:10px 0;"><div class="flbl" id="lbl-pos-name">Nombre del negocio</div><input aria-labelledby="lbl-pos-name" autocomplete="organization" placeholder="Ej. Abarrotes Don Pepe" value="${esc(p.name||'')}" oninput="posSet('name', this.value)" /></div>
      <div class="field" style="padding:10px 0; border-top:1px solid var(--border-soft);"><div class="flbl" id="lbl-pos-addr">Dirección</div><input aria-labelledby="lbl-pos-addr" autocomplete="street-address" placeholder="Calle, número, colonia, ciudad" value="${esc(p.address||'')}" oninput="posSet('address', this.value)" /></div>
      <div class="field" style="padding:10px 0; border-top:1px solid var(--border-soft);"><div class="flbl" id="lbl-pos-phone">Teléfono de contacto</div><input aria-labelledby="lbl-pos-phone" type="tel" autocomplete="tel" placeholder="+52 55 1234 5678" value="${esc(p.phone||'')}" oninput="posSet('phone', this.value)" /></div>
      <div class="field" style="padding:10px 0; border-top:1px solid var(--border-soft);"><div class="flbl" id="lbl-pos-hours">Horario (opcional)</div><input aria-labelledby="lbl-pos-hours" placeholder="Ej. Lun–Sáb 9:00 a 19:00" value="${esc(p.hours||'')}" oninput="posSet('hours', this.value)" /></div>
    </div>

    <div class="section-list" style="margin: 0 14px 14px;">
      <button type="button" class="section-row tap" style="width:100%; background:none; border:0; cursor:pointer;" onclick="posSet('visible', !S.user.pos.visible); render()">
        <div class="em">${p.visible ? '👁️' : '🙈'}</div>
        <div class="body" style="text-align:left;">
          <div class="n">Visible en el directorio</div>
          <div class="c">Otros usuarios pueden encontrar tu punto de venta</div>
        </div>
        <div style="width:42px; height:24px; border-radius:999px; background:${p.visible ? 'var(--green)' : 'var(--surface-3)'}; position:relative; transition: background .15s;">
          <div style="position:absolute; top:2px; left:${p.visible ? '20px' : '2px'}; width:20px; height:20px; border-radius:999px; background:#fff; transition: left .15s; box-shadow: 0 1px 3px rgba(0,0,0,0.2);"></div>
        </div>
      </button>
    </div>

    <div style="padding: 0 14px 24px;">
      <button class="btn brand tap" style="width:100%;" onclick="posSavePOS()">Guardar punto de venta</button>
    </div>
  `;

  return `
    ${topBar("Perfil", false, true, { showSettings: true })}
    <div class="body">
      ${p.registered ? registeredView : formView}
    </div>
    ${bottomNav()}`;
}

/* ---------- SETTINGS ---------- */
function setAccent(c){
  if(!["green","red","gold"].includes(c)) return;
  S.ui.accent = c;
  persist();
  render();
}
function toggleNotifReminders(){
  S.ui.notifReminders = !S.ui.notifReminders;
  persist();
  render();
  toast(S.ui.notifReminders ? "Recordatorios activados" : "Recordatorios desactivados");
}
function setLanguage(lang){
  S.ui.language = lang;
  persist();
  toast("Idioma — solo se guarda la preferencia (próximamente)");
}
function logoutDemo(){
  if(!confirm("¿Cerrar sesión? Tu álbum se mantiene guardado localmente.")) return;
  toast("Sesión cerrada (demo)");
}

function screenSettings(){
  const u = S.user;
  const themes = [
    { id:"light", label:"Claro" },
    { id:"dark",  label:"Oscuro" },
    { id:"auto",  label:"Auto" },
  ];
  const accents = [
    { id:"green", color:"var(--green)" },
    { id:"red",   color:"var(--red)" },
    { id:"gold",  color:"var(--gold)" },
  ];
  const accent = S.ui.accent || "green";
  const theme  = S.ui.theme  || "auto";
  const notif  = !!S.ui.notifReminders;

  return `
    ${topBar("Settings", true, true)}
    <div class="body">

      <div class="shop-section-title">CUENTA</div>
      <div class="section-list" style="margin-bottom:8px;">
        <div class="section-row">
          <div class="em" style="background:var(--green); color:#fff; width:44px; height:44px; border-radius:999px; display:flex; align-items:center; justify-content:center; font-size:20px;">${esc(u.avatar||'·')}</div>
          <div class="body" style="text-align:left;">
            <div class="n">${esc(u.name || 'Invitado')}</div>
            <div class="c">@${esc(u.username || 'invitado')}</div>
          </div>
        </div>
        <button type="button" class="section-row tap" style="width:100%; background:none; border:0; cursor:pointer; border-top:1px solid var(--border-soft);" onclick="logoutDemo()">
          <div class="body" style="text-align:left;"><div class="n" style="color:var(--red);">Cerrar sesión</div></div>
          <div style="color:rgba(206,17,38,.5); font-size:18px;">›</div>
        </button>
      </div>

      <div class="shop-section-title">APARIENCIA</div>
      <div class="section-list" style="margin-bottom:8px;">
        <div class="section-row" style="align-items:center;">
          <div class="body" style="text-align:left;"><div class="n">Tema</div></div>
          <div class="theme-toggle" role="radiogroup" aria-label="Tema" style="width:auto;">
            ${themes.map(t => {
              const active = theme === t.id;
              return `<button class="tap${active?' active':''}" role="radio" aria-checked="${active}" style="padding: 0 12px; min-width:64px;" onclick="setTheme('${t.id}')">${esc(t.label)}</button>`;
            }).join("")}
          </div>
        </div>
        <div class="section-row" style="align-items:center; border-top:1px solid var(--border-soft);">
          <div class="body" style="text-align:left;"><div class="n">Color de acento</div></div>
          <div style="display:flex; gap:10px; align-items:center;">
            ${accents.map(a => {
              const active = accent === a.id;
              return `<button class="tap" aria-label="${a.id}" aria-pressed="${active}" onclick="setAccent('${a.id}')" style="width:28px; height:28px; border-radius:999px; background:${a.color}; border:${active?'2px solid var(--text)':'2px solid transparent'}; box-shadow: 0 0 0 2px var(--surface) inset;"></button>`;
            }).join("")}
          </div>
        </div>
      </div>

      <div class="shop-section-title">IDIOMA</div>
      <div class="section-list" style="margin-bottom:8px;">
        <div class="section-row" style="align-items:center;">
          <div class="body" style="text-align:left;">
            <div class="n">Idioma</div>
            <div class="c">Próximamente — solo se guarda la preferencia.</div>
          </div>
          <select aria-label="Idioma" onchange="setLanguage(this.value)" style="background:transparent; border:0; font-weight:800; font-size:14px; color:var(--text); padding:8px 4px;">
            <option value="es" ${(S.ui.language||'es')==='es'?'selected':''}>Español</option>
            <option value="en" ${(S.ui.language||'es')==='en'?'selected':''}>English</option>
            <option value="pt" ${(S.ui.language||'es')==='pt'?'selected':''}>Português</option>
          </select>
        </div>
      </div>

      <div class="shop-section-title">NOTIFICACIONES</div>
      <div class="section-list" style="margin-bottom:8px;">
        <button type="button" class="section-row tap" style="width:100%; background:none; border:0; cursor:pointer; align-items:center;" onclick="toggleNotifReminders()" aria-pressed="${notif}">
          <div class="body" style="text-align:left;"><div class="n">Recordatorios</div></div>
          <div style="width:42px; height:24px; border-radius:999px; background:${notif ? 'var(--green)' : 'var(--surface-3)'}; position:relative; transition: background .15s;">
            <div style="position:absolute; top:2px; left:${notif ? '20px' : '2px'}; width:20px; height:20px; border-radius:999px; background:#fff; transition: left .15s; box-shadow: 0 1px 3px rgba(0,0,0,0.2);"></div>
          </div>
        </button>
      </div>

      <div class="shop-section-title">ÁLBUM</div>
      <div class="section-list" style="margin-bottom:8px;">
        <button type="button" class="section-row tap" style="width:100%; background:none; border:0; cursor:pointer;" onclick="openExportAlbum()">
          <div class="em">📤</div>
          <div class="body" style="text-align:left;"><div class="n">Exportar álbum</div><div class="c">QR · código · .json</div></div>
          <div style="color:var(--text-faint); font-size:18px;">›</div>
        </button>
        <button type="button" class="section-row tap" style="width:100%; background:none; border:0; cursor:pointer; border-top:1px solid var(--border-soft);" onclick="openImportAlbum()">
          <div class="em">📥</div>
          <div class="body" style="text-align:left;"><div class="n">Importar álbum</div><div class="c">Pegar · subir · escanear</div></div>
          <div style="color:var(--text-faint); font-size:18px;">›</div>
        </button>
      </div>

      <div class="shop-section-title">ACERCA DE</div>
      <div class="section-list" style="margin-bottom:8px;">
        <div class="section-row">
          <div class="body" style="text-align:left;"><div class="n">Versión</div></div>
          <div style="color:var(--text-muted); font-weight:700; font-size:13px;">1.0.0</div>
        </div>
        <button type="button" class="section-row tap" style="width:100%; background:none; border:0; cursor:pointer; border-top:1px solid var(--border-soft);" onclick="toast('Términos — próximamente')">
          <div class="body" style="text-align:left;"><div class="n">Términos</div></div>
          <div style="color:var(--text-faint); font-size:18px;">›</div>
        </button>
        <button type="button" class="section-row tap" style="width:100%; background:none; border:0; cursor:pointer; border-top:1px solid var(--border-soft);" onclick="toast('Privacidad — próximamente')">
          <div class="body" style="text-align:left;"><div class="n">Privacidad</div></div>
          <div style="color:var(--text-faint); font-size:18px;">›</div>
        </button>
        <button type="button" class="section-row tap" style="width:100%; background:none; border:0; cursor:pointer; border-top:1px solid var(--border-soft);" onclick="toast('Ayuda — próximamente')">
          <div class="body" style="text-align:left;"><div class="n">Ayuda y soporte</div></div>
          <div style="color:var(--text-faint); font-size:18px;">›</div>
        </button>
      </div>

      <div style="padding: 0 14px 24px; text-align:center; font-size:11px; color:var(--text-faint);">
        Mundial 26 · v1.0 · Hecho con 🏆 en GDL
      </div>
    </div>
    ${bottomNav()}`;
}

/* =====================================================================
   ALBUM EXPORT / IMPORT
   ===================================================================== */
const ALBUM_EXPORT_VERSION = 1;

function buildAlbumExportPayload(){
  return {
    version: ALBUM_EXPORT_VERSION,
    timestamp: new Date().toISOString(),
    album: JSON.parse(JSON.stringify(S.album || {})),
    phone: (S.user && S.user.phone) || ""
  };
}
function encodeAlbumPayload(payload){
  return LZString.compressToEncodedURIComponent(JSON.stringify(payload));
}
function decodeAlbumCode(code){
  const c = String(code||"").trim();
  if(!c) throw new Error("Código vacío");
  let json;
  try { json = LZString.decompressFromEncodedURIComponent(c); }
  catch(e){ throw new Error("No se pudo descomprimir"); }
  if(json == null || json === "") throw new Error("Código inválido o corrupto");
  let payload;
  try { payload = JSON.parse(json); }
  catch(e){ throw new Error("JSON inválido"); }
  return payload;
}
function validateAlbumPayload(p){
  if(!p || typeof p !== "object" || Array.isArray(p)) return "Formato inválido";
  const ver = Number(p.version);
  if(!Number.isFinite(ver)) return "Versión inválida";
  if(ver < 1 || ver > ALBUM_EXPORT_VERSION) return "Versión incompatible: " + p.version;
  if(p.timestamp == null || (typeof p.timestamp !== "string" && typeof p.timestamp !== "number")) return "Timestamp inválido";
  if(!p.album || typeof p.album !== "object" || Array.isArray(p.album)) return "Falta el álbum";
  if(p.phone != null && typeof p.phone !== "string") return "Teléfono inválido";
  for(const gid of Object.keys(p.album)){
    if(!ALBUM.some(g => g.id === gid)) return "Grupo desconocido: " + gid;
    const g = p.album[gid];
    if(!g || typeof g !== "object" || Array.isArray(g)) return "Grupo inválido: " + gid;
    for(const n of Object.keys(g)){
      if(!/^[0-9]+$/.test(n)) return "Número inválido en " + gid;
      const s = g[n];
      if(s == null) continue;
      if(typeof s !== "object" || Array.isArray(s)) return "Sticker inválido en " + gid + ":" + n;
      if(typeof s.owned !== "number" || !Number.isFinite(s.owned) || s.owned < 0 || s.owned > 999) return "Cantidad inválida en " + gid + ":" + n;
      if(s.forSwap != null && typeof s.forSwap !== "boolean") return "forSwap inválido en " + gid + ":" + n;
    }
  }
  return null;
}
function albumPayloadStats(p){
  let owned=0, dup=0, codes=0;
  if(p && p.album){
    for(const gid in p.album){
      const g = p.album[gid] || {};
      for(const n in g){
        const s = g[n]; if(!s) continue;
        const c = Number(s.owned)||0;
        if(c>0){ owned++; codes += c; if(c>1) dup += c-1; }
      }
    }
  }
  return {owned, dup, codes};
}

/* ----- Export modal ----- */
function openExportAlbum(){
  const payload = buildAlbumExportPayload();
  let code = "", error = null;
  try { code = encodeAlbumPayload(payload); } catch(e){ error = e.message || String(e); }
  S.ui.modal = "albumExport";
  S.ui.modalData = { exportPayload: payload, exportCode: code, exportError: error };
  renderModal();
}
function renderAlbumExportModal(){
  const d = S.ui.modalData || {};
  const stats = albumPayloadStats(d.exportPayload);
  const code = d.exportCode || "";
  const error = d.exportError;
  return `
    <div class="handle" aria-hidden="true"></div>
    <button class="close-x tap" onclick="closeModal()" aria-label="Cerrar">✕</button>
    <h2 id="modal-title">Exportar álbum</h2>
    ${error ? `<div class="qa-help err" style="margin: 4px 0 12px;">${esc(error)}</div>` : `
      <div style="text-align:center; padding: 6px 0 4px;">
        <div id="alb-export-canvas-wrap" style="display:inline-block; padding:10px; background:#fff; border:1px solid var(--border); border-radius:14px;">
          <canvas id="alb-export-canvas" width="240" height="240" style="display:block;"></canvas>
        </div>
        <div id="alb-export-qr-fallback" style="display:none; padding:14px; font-size:12px; color:var(--text-muted); max-width:280px; margin:0 auto;"></div>
      </div>
    `}
    <div style="font-size:11px; color: var(--text-muted); text-align:center; margin-top:8px; line-height:1.5;">
      ${stats.owned} stickers · ${stats.dup} repetidas · v${ALBUM_EXPORT_VERSION}
    </div>
    <div style="display:flex; gap:8px; margin-top:14px;">
      <button class="btn ghost tap" style="flex:1;" onclick="exportCopyCode()">⎘ Copiar código</button>
      <button class="btn primary tap" style="flex:1;" onclick="downloadAlbumExport()">⬇ Descargar .json</button>
    </div>
  `;
}
function renderAlbumExportQR(){
  const c = document.getElementById("alb-export-canvas");
  if(!c) return;
  const code = (S.ui.modalData && S.ui.modalData.exportCode) || "";
  const fallback = document.getElementById("alb-export-qr-fallback");
  const wrap = document.getElementById("alb-export-canvas-wrap");
  if(typeof window.QRCode === "undefined" || !window.QRCode.toCanvas){
    if(fallback){ fallback.style.display = "block"; fallback.textContent = "QRCode lib no cargó. Usa Copiar o Descargar."; }
    if(wrap) wrap.style.display = "none";
    return;
  }
  window.QRCode.toCanvas(c, code || " ", { errorCorrectionLevel: "M", margin: 1, width: 240, color: { dark: "#0B1F15", light: "#FFFFFF" } }, (err) => {
    if(err){
      if(fallback){ fallback.style.display = "block"; fallback.textContent = "El QR es muy grande para mostrarse (" + (code.length) + " chars). Usa Copiar código o Descargar .json para transferir."; }
      if(wrap) wrap.style.display = "none";
    }
  });
}
function exportCopyCode(){
  const code = (S.ui.modalData && S.ui.modalData.exportCode) || "";
  if(!code){ toast("Sin código"); return; }
  copyText(code);
}
function downloadAlbumExport(){
  try {
    const payload = (S.ui.modalData && S.ui.modalData.exportPayload) || buildAlbumExportPayload();
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `album-mundial26-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(url), 1500);
    toast("Descargando .json");
  } catch(e){ toast("No se pudo descargar"); }
}

/* ----- Import modal ----- */
function openImportAlbum(){
  S.ui.modal = "albumImport";
  S.ui.modalData = { mode: "paste", text: "", error: null };
  renderModal();
}
function importSetMode(m){
  if(S.ui.modalData.mode === m) return;
  if(S.ui.modalData.mode === "scan") stopAlbumScanner();
  S.ui.modalData.mode = m;
  S.ui.modalData.error = null;
  renderModal();
}
function importRetryScanner(){
  stopAlbumScanner();
  S.ui.modalData.error = null;
  renderModal();
}
function importHandlePasteInput(v){
  S.ui.modalData.text = v;
  if(S.ui.modalData.error){ S.ui.modalData.error = null; renderModal(); }
}
function importTryDecode(input){
  if(typeof input !== "string"){
    const vErr = validateAlbumPayload(input);
    return vErr ? { error: vErr } : { payload: input };
  }
  const t = input.trim();
  if(!t) return { error: "Pega o escanea un código" };
  let payload;
  if(t.charAt(0) === "{"){
    try { payload = JSON.parse(t); }
    catch(e){ return { error: "JSON inválido" }; }
  } else {
    try { payload = decodeAlbumCode(t); }
    catch(e){ return { error: e.message || "Código inválido" }; }
  }
  const vErr = validateAlbumPayload(payload);
  if(vErr) return { error: vErr };
  return { payload };
}
function importApplyPaste(){
  const r = importTryDecode(S.ui.modalData.text || "");
  if(r.error){ S.ui.modalData.error = r.error; renderModal(); return; }
  importMoveToConfirm(r.payload);
}
function importHandleFile(input){
  const f = input && input.files && input.files[0]; if(!f) return;
  const reader = new FileReader();
  reader.onload = () => {
    const r = importTryDecode(String(reader.result || "").trim());
    if(r.error){ S.ui.modalData.error = r.error; renderModal(); return; }
    importMoveToConfirm(r.payload);
  };
  reader.onerror = () => { S.ui.modalData.error = "No se pudo leer el archivo"; renderModal(); };
  reader.readAsText(f);
}
function importScanFromImage(input){
  const f = input && input.files && input.files[0]; if(!f) return;
  if(typeof window.jsQR === "undefined"){
    S.ui.modalData.error = "Escáner no disponible (jsQR no cargó)";
    renderModal(); return;
  }
  const url = URL.createObjectURL(f);
  const img = new Image();
  img.onload = () => {
    const max = 1600;
    let w = img.naturalWidth, h = img.naturalHeight;
    if(w > max || h > max){ const k = max/Math.max(w,h); w = Math.round(w*k); h = Math.round(h*k); }
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const ctx = c.getContext("2d");
    ctx.drawImage(img, 0, 0, w, h);
    const data = ctx.getImageData(0,0,w,h);
    const found = window.jsQR(data.data, w, h);
    URL.revokeObjectURL(url);
    if(!found){ S.ui.modalData.error = "No se detectó QR en la imagen"; renderModal(); return; }
    const r = importTryDecode(found.data);
    if(r.error){ S.ui.modalData.error = r.error; renderModal(); return; }
    importMoveToConfirm(r.payload);
  };
  img.onerror = () => { URL.revokeObjectURL(url); S.ui.modalData.error = "No se pudo leer la imagen"; renderModal(); };
  img.src = url;
}
function importMoveToConfirm(payload){
  stopAlbumScanner();
  S.ui.modal = "albumImportConfirm";
  S.ui.modalData = { payload };
  renderModal();
}
function importConfirmApply(){
  const p = S.ui.modalData && S.ui.modalData.payload;
  if(!p){ closeModal(); return; }
  S.album = JSON.parse(JSON.stringify(p.album || {}));
  if(typeof p.phone === "string" && p.phone.length){ S.user.phone = p.phone; }
  persist();
  closeModal();
  toast("Álbum importado");
  render();
}
function renderAlbumImportModal(){
  const d = S.ui.modalData || {};
  const mode = d.mode || "paste";
  const tab = (id, label) => `<button class="chip ${mode===id?'active':''}" style="cursor:pointer; flex:1;" onclick="importSetMode('${id}')">${esc(label)}</button>`;
  let body = "";
  if(mode === "paste"){
    body = `
      <textarea id="alb-imp-text" rows="5" placeholder="Pega aquí el código exportado o el JSON…" oninput="importHandlePasteInput(this.value)" style="width:100%; padding:12px; border-radius:12px; border:1px solid var(--border-strong); font-family:'SF Mono',Menlo,monospace; font-size:12px; resize:vertical; min-height:110px; background:var(--surface); color:var(--text);">${esc(d.text||"")}</textarea>
      <button class="btn primary tap" style="margin-top:10px;" onclick="importApplyPaste()">Continuar</button>
    `;
  } else if(mode === "upload"){
    body = `
      <label class="btn ghost tap" style="cursor:pointer;">
        Seleccionar archivo .json
        <input type="file" accept="application/json,.json,text/plain" style="display:none;" onchange="importHandleFile(this)" />
      </label>
      <div style="font-size:11px; color: var(--text-muted); text-align:center; margin-top:10px;">Sube el .json exportado.</div>
    `;
  } else if(mode === "scan"){
    body = `
      <div style="position:relative; aspect-ratio:1/1; background:#000; border-radius:14px; overflow:hidden;">
        <video id="alb-scan-video" autoplay muted playsinline style="width:100%; height:100%; object-fit:cover;"></video>
        <div style="position:absolute; inset:14%; border:2px solid rgba(255,255,255,.85); border-radius:14px; pointer-events:none;"></div>
      </div>
      <div style="font-size:11px; color: var(--text-muted); text-align:center; margin-top:8px;">Apunta al QR del otro dispositivo</div>
      <label class="btn ghost tap" style="cursor:pointer; margin-top:10px;">
        o subir foto del QR
        <input type="file" accept="image/*" style="display:none;" onchange="importScanFromImage(this)" />
      </label>
    `;
  }
  return `
    <div class="handle" aria-hidden="true"></div>
    <button class="close-x tap" onclick="closeModal()" aria-label="Cerrar">✕</button>
    <h2 id="modal-title">Importar álbum</h2>
    <div style="display:flex; gap:6px; margin-bottom: 12px;">
      ${tab("paste","Pegar")}
      ${tab("upload","Subir .json")}
      ${tab("scan","Escanear QR")}
    </div>
    ${body}
    ${d.error ? `
      <div class="qa-help err" style="margin-top:10px;">${esc(d.error)}</div>
      ${mode==='scan' ? `<button class="btn ghost tap sm" style="margin-top:8px;" onclick="importRetryScanner()">Reintentar cámara</button>` : ``}
    ` : ``}
  `;
}
function renderAlbumImportConfirmModal(){
  const p = (S.ui.modalData && S.ui.modalData.payload) || {};
  const stats = albumPayloadStats(p);
  const ts = String(p.timestamp||"").replace("T"," ").slice(0,16);
  return `
    <div class="handle" aria-hidden="true"></div>
    <button class="close-x tap" onclick="closeModal()" aria-label="Cerrar">✕</button>
    <h2 id="modal-title">¿Reemplazar álbum actual?</h2>
    <div style="text-align:center; font-size:14px; color: var(--text); line-height:1.5; padding: 4px 6px 0;">
      Vas a reemplazar tu álbum con <b>${stats.owned}</b> stickers
      ${stats.dup>0?` (${stats.dup} repetidas)`:""}.
    </div>
    <div style="background:rgba(206,17,38,0.08); border-radius:12px; padding:10px 12px; margin-top:14px; font-size:12px; color:var(--red); text-align:center; font-weight:700;">
      ⚠️ Acción irreversible. Tu álbum actual se perderá.
    </div>
    <div style="font-size:11px; color: var(--text-faint); text-align:center; margin-top:10px;">
      ${ts ? `Exportado: ${esc(ts)}` : ""}${p.phone ? ` · 📱 ${esc(p.phone)}` : ""}
    </div>
    <div style="display:flex; gap:8px; margin-top:18px;">
      <button class="btn ghost tap" style="flex:1;" onclick="closeModal()">Cancelar</button>
      <button class="btn urgent tap" style="flex:1;" onclick="importConfirmApply()">Reemplazar</button>
    </div>
  `;
}

/* ----- Live QR scanner ----- */
const _albumScan = { stream:null, raf:0, video:null, canvas:null, ctx:null, aborted:false, lastErrAt:0 };
function _albumScanAttachToDOM(){
  const v = document.getElementById("alb-scan-video");
  if(!v || !_albumScan.stream) return false;
  if(v.srcObject !== _albumScan.stream){
    v.srcObject = _albumScan.stream;
    v.setAttribute("playsinline","");
    try { v.play(); } catch(e){}
  }
  _albumScan.video = v;
  return true;
}
function _albumScanTick(){
  const vid = _albumScan.video;
  if(!vid || !_albumScan.stream){ _albumScan.raf = 0; return; }
  if(vid.readyState === 4){
    const w = vid.videoWidth, h = vid.videoHeight;
    if(w && h){
      _albumScan.canvas.width = w; _albumScan.canvas.height = h;
      _albumScan.ctx.drawImage(vid, 0, 0, w, h);
      const img = _albumScan.ctx.getImageData(0, 0, w, h);
      const found = window.jsQR(img.data, w, h, { inversionAttempts: "dontInvert" });
      if(found && found.data){
        const r = importTryDecode(found.data);
        if(r.payload){ stopAlbumScanner(); importMoveToConfirm(r.payload); return; }
        if(Date.now() - _albumScan.lastErrAt > 2000){
          _albumScan.lastErrAt = Date.now();
          toast("QR inválido: " + (r.error || ""));
        }
      }
    }
  }
  _albumScan.raf = requestAnimationFrame(_albumScanTick);
}
async function startAlbumScanner(){
  if(_albumScan.stream){
    if(_albumScanAttachToDOM() && !_albumScan.raf){
      _albumScan.raf = requestAnimationFrame(_albumScanTick);
    }
    return;
  }
  if(_albumScan.aborted) return;
  if(typeof window.jsQR === "undefined"){
    _albumScan.aborted = true;
    S.ui.modalData.error = "Escáner no disponible (jsQR no cargó)";
    renderModal(); return;
  }
  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
    _albumScan.aborted = true;
    S.ui.modalData.error = "Tu navegador no soporta cámara. Usa subir foto del QR.";
    renderModal(); return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
    if(S.ui.modal !== "albumImport" || (S.ui.modalData && S.ui.modalData.mode) !== "scan"){
      stream.getTracks().forEach(t=>t.stop()); return;
    }
    _albumScan.stream = stream;
    if(!_albumScanAttachToDOM()){
      stream.getTracks().forEach(t=>t.stop());
      _albumScan.stream = null; return;
    }
    _albumScan.canvas = document.createElement("canvas");
    _albumScan.ctx = _albumScan.canvas.getContext("2d", { willReadFrequently: true });
    _albumScan.raf = requestAnimationFrame(_albumScanTick);
  } catch(e){
    _albumScan.aborted = true;
    S.ui.modalData.error = "No se pudo acceder a la cámara. Usa subir foto del QR.";
    renderModal();
  }
}
function stopAlbumScanner(){
  try { if(_albumScan.raf) cancelAnimationFrame(_albumScan.raf); } catch(e){}
  _albumScan.raf = 0;
  if(_albumScan.stream){
    try { _albumScan.stream.getTracks().forEach(t=>t.stop()); } catch(e){}
  }
  _albumScan.stream = null;
  _albumScan.video = null;
  _albumScan.aborted = false;
  _albumScan.lastErrAt = 0;
}

/* =====================================================================
   THEME (light / dark / auto)
   ===================================================================== */
function applyTheme(){
  const t = (S.ui && S.ui.theme) || "auto";
  const root = document.documentElement;
  if(t === "auto") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", t);
  // Keep mobile browser chrome / iOS status bar in sync with the resolved bg
  const dark = t === "dark" || (t === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  let meta = document.querySelector('meta[name="theme-color"]');
  if(!meta){ meta = document.createElement("meta"); meta.name = "theme-color"; document.head.appendChild(meta); }
  meta.setAttribute("content", dark ? "#0e1410" : "#FAF6EE");
}
function setTheme(t){
  if(!["auto","light","dark"].includes(t)) return;
  S.ui.theme = t;
  applyTheme();
  persist();
  render();
}
// Re-evaluate when the OS preference flips, but only if user is on "auto"
if(typeof window !== "undefined" && window.matchMedia){
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const onChange = () => { if(((S.ui && S.ui.theme) || "auto") === "auto") applyTheme(); };
  if(mq.addEventListener) mq.addEventListener("change", onChange);
  else if(mq.addListener) mq.addListener(onChange);
}

/* =====================================================================
   RENDER
   ===================================================================== */
function render(){
  persist();
  // Drop the Faltantes snapshot whenever the user is off the album screen, so
  // that returning to the Faltantes tab counts as a fresh entry and refreezes.
  if (S.screen !== "album" && S.screen !== "album-group") _faltantesFrozen = null;
  const app = document.getElementById("app");
  let html = "";
  switch(S.screen){
    case "album": html = screenAlbum(); break;
    case "album-group": html = screenAlbum(); break;
    case "stats": html = screenStats(); break;
    case "tienda": html = screenTienda(); break;
    case "productos": html = screenProductos(); break;
    case "producto": html = screenProducto(); break;
    case "carrito": html = screenCarrito(); break;
    case "checkout": html = screenCheckout(); break;
    case "checkout-success": html = screenSuccess(); break;
    case "checkout-failure": html = screenFailure(); break;
    case "orden": html = screenOrden(); break;
    case "qr": html = screenQR(); break;
    case "scan": html = screenScan(); break;
    case "swap": html = screenSwap(); break;
    case "mypanini-create": html = screenMyPaniniCreate(); break;
    case "perfil": html = screenPerfil(); break;
    case "settings": html = screenSettings(); break;
    case "swap-receipt": html = screenSwapReceipt(); break;
    default: html = screenAlbum();
  }
  app.innerHTML = html;
  // Attach long-press to stickers
  document.querySelectorAll('[data-long="1"]').forEach(el => {
    attachLongPress(el, el.getAttribute("data-gid"), parseInt(el.getAttribute("data-n"),10));
  });
  attachAddressAutocomplete();
  if(S.screen === "qr"){ renderOfferQR(); }
  if(S.screen === "swap-receipt"){ renderReceiptQR(); }
  _missingPopupRefresh();
}

function updateAddressStatus(){
  const status = document.getElementById("address-status");
  if(!status) return;
  const verified = !!(S.user.addressDetails && S.user.addressDetails.lat);
  status.classList.toggle("ok", verified);
  const text = status.querySelector("span:last-child");
  if(text) text.textContent = verified ? "Domicilio verificado con Google Maps" : "Selecciona una sugerencia o usa tu ubicación";
}

const DELIVERY_ZONES = {
  gdl: {
    // Casa Anomalistyc — C. Miguel Lerdo de Tejada 2081, Col. Americana
    // (Lafayette), 44150 Guadalajara, Jal.
    center: { lat: 20.6713, lng: -103.3749 },
    label: "Zona metropolitana de Guadalajara",
    // Custom polygon traced by the user covering the ZMG urban area
    // (Zapopan, Centro GDL, parts of Tlaquepaque, Las Águilas, ITESO).
    // Vertices in clockwise order, lat/lng pairs.
    polygon: [
      { lat: 20.715, lng: -103.435 }, // NW — north of Estadio Akron / Instituto Tec
      { lat: 20.725, lng: -103.420 }, // N-NW — above Andares
      { lat: 20.725, lng: -103.395 }, // N  — above Arcos de Zapopan
      { lat: 20.722, lng: -103.345 }, // NNE — Tabachines
      { lat: 20.715, lng: -103.310 }, // NE — past Hwy 54
      { lat: 20.690, lng: -103.295 }, // E  — past The Home Depot
      { lat: 20.655, lng: -103.295 }, // ESE
      { lat: 20.620, lng: -103.330 }, // SE
      { lat: 20.605, lng: -103.395 }, // S  — past ITESO
      { lat: 20.605, lng: -103.450 }, // SW — Santa Ana Tepetitlán
      { lat: 20.640, lng: -103.470 }, // W  — past San Juan de Ocotán
      { lat: 20.690, lng: -103.465 }, // WNW
    ],
  },
};

function haversineKm(a, b){
  const R = 6371;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x = Math.sin(dLat/2)**2 + Math.sin(dLng/2)**2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(x));
}

// Standard ray-casting (even-odd rule). At ZMG scale, treating lat/lng as
// planar adds <50m of error — fine for a delivery boundary.
function pointInPolygon(point, polygon){
  let inside = false;
  for(let i = 0, j = polygon.length - 1; i < polygon.length; j = i++){
    const xi = polygon[i].lng, yi = polygon[i].lat;
    const xj = polygon[j].lng, yj = polygon[j].lat;
    const intersect = ((yi > point.lat) !== (yj > point.lat)) &&
      (point.lng < (xj - xi) * (point.lat - yi) / (yj - yi) + xi);
    if(intersect) inside = !inside;
  }
  return inside;
}

function isInsideZone(lat, lng, zoneKey){
  const z = DELIVERY_ZONES[zoneKey];
  if(!z || typeof lat !== "number" || typeof lng !== "number") return true;
  if(Array.isArray(z.polygon) && z.polygon.length >= 3){
    return pointInPolygon({ lat, lng }, z.polygon);
  }
  if(z.center && typeof z.radiusKm === "number"){
    return haversineKm(z.center, { lat, lng }) <= z.radiusKm;
  }
  return true;
}

function injectAutocompleteShadowStyles(el){
  const apply = () => {
    const root = el.shadowRoot;
    if(!root) return false;
    if(root.querySelector("style[data-mundial-injected]")) return true;
    const style = document.createElement("style");
    style.setAttribute("data-mundial-injected", "1");
    style.textContent = `
      :host, :host(*) { background: transparent !important; border: 0 !important; box-shadow: none !important; outline: none !important; }
      * { box-shadow: none !important; outline: none !important; text-shadow: none !important; }
      div, span, section, header, footer, fieldset, legend, label, [class*="container"], [class*="wrapper"], [class*="frame"], [class*="border"], [class*="outline"], [class*="notch"], [class*="ring"], [class*="trail"], [class*="lead"] { background: transparent !important; border: 0 !important; }
      fieldset, legend { padding: 0 !important; margin: 0 !important; }
      input, .input, [role="combobox"] { background: transparent !important; color: inherit !important; border: 0 !important; box-shadow: none !important; outline: none !important; padding: 0 12px !important; font-family: inherit !important; font-size: 14px !important; height: 40px !important; line-height: 40px !important; }
      input:focus, input:focus-visible { outline: none !important; box-shadow: none !important; border: 0 !important; }
      input::placeholder { color: rgba(0,0,0,0.55) !important; }
    `;
    root.appendChild(style);
    return true;
  };
  if(apply()) return;
  let tries = 0;
  const id = setInterval(() => {
    tries++;
    if(apply() || tries > 20) clearInterval(id);
  }, 200);
}

function getComp(comps, type){
  const c = (comps || []).find(x => x.types && x.types.includes(type));
  return c ? (c.longText || c.long_name || "") : "";
}

function fillAddressForm(place){
  const comps = place.addressComponents || place.address_components || [];
  const lat = typeof place.location?.lat === "function" ? place.location.lat() : (place.location?.lat ?? place.geometry?.location?.lat?.());
  const lng = typeof place.location?.lng === "function" ? place.location.lng() : (place.location?.lng ?? place.geometry?.location?.lng?.());
  const formatted = place.formattedAddress || place.formatted_address || "";
  const streetNumber = getComp(comps, "street_number");
  const route = getComp(comps, "route");
  const colonia = getComp(comps, "sublocality_level_1") || getComp(comps, "neighborhood") || getComp(comps, "sublocality");
  const localidad = getComp(comps, "locality") || colonia;
  const municipio = getComp(comps, "administrative_area_level_2") || getComp(comps, "locality");
  const estado = getComp(comps, "administrative_area_level_1");
  const cp = getComp(comps, "postal_code");
  const country = getComp(comps, "country");

  if(!S.user.addressForm) S.user.addressForm = {};
  const af = S.user.addressForm;
  af.estado = estado;
  af.municipio = municipio;
  af.localidad = localidad;
  af.colonia = colonia;
  af.cp = cp;
  af.cp_unknown = !cp;
  af.sin_numero = !streetNumber;

  S.user.address = formatted || [route, streetNumber].filter(Boolean).join(" ");
  S.user.addressDetails = {
    lat, lng, formatted,
    street_number: streetNumber,
    route,
    neighborhood: colonia,
    city: municipio,
    state: estado,
    postal_code: cp,
    country,
  };
  if(S.ui.delivery === "gdl"){
    S.user.addressOutOfZone = !isInsideZone(lat, lng, "gdl");
  } else {
    S.user.addressOutOfZone = false;
  }
  persist();

  const setVal = (id, v) => { const el = document.getElementById(id); if(el) el.value = v || ""; };
  setVal("checkout-address-fallback", S.user.address);
  setVal("af-estado", estado);
  setVal("af-municipio", municipio);
  setVal("af-localidad", localidad);
  setVal("af-colonia", colonia);
  setVal("af-cp", cp);
  const acInput = document.getElementById("checkout-address-input");
  if(acInput && "value" in acInput) acInput.value = S.user.address;
  updateAddressStatus();
  if(S.ui.delivery === "gdl") render();
}

async function attachAddressAutocomplete(){
  const container = document.getElementById("checkout-address-ac");
  if(!container) return;
  if(container.dataset.acAttached === "1") return;
  if(typeof google === "undefined" || !google.maps || !google.maps.importLibrary){
    setTimeout(attachAddressAutocomplete, 400);
    return;
  }
  container.dataset.acAttached = "1";
  try {
    const { PlaceAutocompleteElement } = await google.maps.importLibrary("places");
    const acOpts = { includedRegionCodes: ["mx"] };
    if(S.ui.delivery === "gdl"){
      const z = DELIVERY_ZONES.gdl;
      acOpts.locationRestriction = { center: z.center, radius: z.radiusKm * 1000 };
    }
    const ac = new PlaceAutocompleteElement(acOpts);
    ac.id = "checkout-address-input";
    ac.style.width = "100%";
    container.innerHTML = "";
    container.appendChild(ac);
    injectAutocompleteShadowStyles(ac);
    ac.addEventListener("gmp-select", async ({ placePrediction }) => {
      try {
        const place = placePrediction.toPlace();
        await place.fetchFields({
          fields: ["formattedAddress","location","addressComponents","displayName"],
        });
        fillAddressForm(place);
      } catch(err) {
        console.error("[places] fetchFields failed", err);
      }
    });
  } catch(err) {
    console.error("[google maps] PlaceAutocompleteElement load failed", err);
    container.dataset.acAttached = "0";
  }
}

async function requestUserLocation(){
  if(!navigator.geolocation){
    toast("Tu navegador no soporta geolocalización");
    return;
  }
  if(typeof google === "undefined" || !google.maps || !google.maps.importLibrary){
    toast("Google Maps no cargó todavía, espera un momento");
    return;
  }
  toast("Obteniendo tu ubicación…");
  navigator.geolocation.getCurrentPosition(async (pos) => {
    const { latitude, longitude } = pos.coords;
    try {
      const { Geocoder } = await google.maps.importLibrary("geocoding");
      const geocoder = new Geocoder();
      const { results } = await geocoder.geocode({ location: { lat: latitude, lng: longitude } });
      if(results && results[0]){
        const r = results[0];
        const adapted = {
          formattedAddress: r.formatted_address,
          location: { lat: r.geometry.location.lat(), lng: r.geometry.location.lng() },
          addressComponents: r.address_components.map(c => ({
            longText: c.long_name,
            shortText: c.short_name,
            types: c.types,
          })),
        };
        fillAddressForm(adapted);
        toast("Ubicación encontrada");
      } else {
        toast("No se encontró tu dirección");
      }
    } catch(err) {
      console.error("[geolocation] reverse geocode failed", err);
      const msg = String(err?.message || err);
      if(msg.includes("Geocoding") || msg.includes("REQUEST_DENIED")){
        toast("Habilita Geocoding API en Google Cloud");
      } else {
        toast("Error consultando dirección");
      }
    }
  }, (err) => {
    if(err.code === 1) toast("Permite el acceso a tu ubicación");
    else if(err.code === 3) toast("Tiempo agotado obteniendo ubicación");
    else toast("Error al obtener ubicación");
  }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
}

/* ---------- REFERRAL ---------- */
const WELCOME_CREDIT_AMOUNT = 100;
const REFERRAL_HEADLINE = "Tu álbum se llena. Tu saldo también.";
const REFERRAL_TAGLINE  = "Invita amigos, gana 10% de cada compra que hagan. Para siempre.";
// Minimum applicable credit per order — under this we hide the toggle and
// don't apply, to avoid noisy 1-2 peso lines on tiny orders.
const MIN_CREDIT_APPLY = 10;

function ensureReferralShape(){
  if(!S.referral) S.referral = {};
  if(typeof S.referral.balance !== "number") S.referral.balance = 0;
  if(typeof S.referral.totalEarned !== "number") S.referral.totalEarned = 0;
  if(!Array.isArray(S.referral.earnings)) S.referral.earnings = [];
  if(typeof S.referral.useCredit !== "boolean") S.referral.useCredit = true;
}

// Append an earning to the local ledger and bump the spendable balance. Idempotent
// per orderId — repeated calls (e.g. when summary.events is re-synced from the
// backend) are no-ops. amount is in MXN and floored to integer pesos.
function addReferralEarning(orderId, fromUserId, amount){
  ensureReferralShape();
  const amt = Math.max(0, Math.floor(Number(amount) || 0));
  if(!orderId || amt <= 0) return false;
  if(S.referral.earnings.some(e => e.orderId === orderId)) return false;
  S.referral.earnings.unshift({
    orderId: String(orderId),
    fromUserId: fromUserId ? String(fromUserId) : null,
    amount: amt,
    date: new Date().toISOString(),
  });
  S.referral.balance += amt;
  S.referral.totalEarned += amt;
  persist();
  return true;
}

// Consume credit at order submit. Returns the amount actually deducted (in
// case the requested amount was larger than the live balance, which would
// indicate a stale UI; we clamp rather than going negative).
function useReferralCredit(amount){
  ensureReferralShape();
  const want = Math.max(0, Math.floor(Number(amount) || 0));
  if(want <= 0) return 0;
  const taken = Math.min(want, S.referral.balance);
  S.referral.balance -= taken;
  persist();
  return taken;
}

// Restore credit after a cancelled / failed / refunded order.
function revertReferralCredit(amount){
  ensureReferralShape();
  const back = Math.max(0, Math.floor(Number(amount) || 0));
  if(back <= 0) return 0;
  S.referral.balance += back;
  persist();
  return back;
}

// How much credit can the user CURRENTLY apply to the cart, before the user
// flips the toggle. Capped at the live balance or the order subtotal —
// whichever is smaller — so credit can fully cover the order. If the
// result is below MIN_CREDIT_APPLY we return 0 so callers can hide the
// line/toggle. Credit stays non-cashable: the only way out is in-app
// discount.
function referralCreditCap(subtotal){
  ensureReferralShape();
  const cap = Math.min(S.referral.balance, Math.floor(Number(subtotal) || 0));
  return cap >= MIN_CREDIT_APPLY ? cap : 0;
}

// How much credit is being applied right now: the cap, gated by the toggle.
// Optional `headroom` argument lets callers ensure (welcomeCredit + referralCredit)
// never exceeds the subtotal — passes the remaining base after welcome.
function referralCreditApplied(subtotal, headroom){
  ensureReferralShape();
  if(!S.referral.useCredit) return 0;
  const cap = referralCreditCap(subtotal);
  if(cap <= 0) return 0;
  if(typeof headroom === "number") return Math.min(cap, Math.max(0, Math.floor(headroom)));
  return cap;
}

function toggleUseReferralCredit(){
  ensureReferralShape();
  S.referral.useCredit = !S.referral.useCredit;
  persist();
  render();
}

function captureReferralFromUrl(){
  try {
    const params = new URLSearchParams(window.location.search || "");
    const ref = (params.get("ref") || "").trim().toUpperCase();
    if(!ref || ref.length < 2 || ref.length > 24) return;
    if(ref === (S.user.referralCode || "").trim().toUpperCase()) return;
    if(!S.referral) S.referral = {};
    if(S.referral.applied !== ref){
      S.referral.applied = ref;
      S.referral.appliedAt = new Date().toISOString();
      if(!S.referral.welcomeCreditUsed){
        S.referral.welcomeCredit = WELCOME_CREDIT_AMOUNT;
      }
      persist();
      try { toast(`✓ Código ${ref} aplicado · $${WELCOME_CREDIT_AMOUNT} en tu primera compra`); } catch(e){}
    }
  } catch(e){ /* noop */ }
}

function welcomeCreditAvailable(){
  if(!S.referral || !S.referral.applied) return 0;
  if(S.referral.welcomeCreditUsed) return 0;
  return Math.min(S.referral.welcomeCredit || 0, cartSubtotal());
}

function referralBanner(){
  const credit = welcomeCreditAvailable();
  if(credit <= 0 && !S.referral?.applied) return "";
  if(S.referral?.welcomeCreditUsed) return "";
  const ref = S.referral.applied || "";
  return `<div class="ref-banner">
    <div class="ref-banner-l">
      <div class="ref-banner-em">🎁</div>
    </div>
    <div class="ref-banner-c">
      <div class="ref-banner-t">$${WELCOME_CREDIT_AMOUNT} de bienvenida</div>
      <div class="ref-banner-s">Se aplica al pagar tu primera compra. Código <b>${esc(ref)}</b>.</div>
    </div>
  </div>`;
}

async function fetchReferralSummary(){
  const code = (S.user.referralCode || "").trim().toUpperCase();
  if(!code || !BACKEND_URL) return;
  try {
    const r = await fetch(`${BACKEND_URL}/api/referral/${encodeURIComponent(code)}/summary`);
    if(!r.ok) return;
    const data = await r.json();
    ensureReferralShape();
    S.referral.summary = data;
    // Mirror new commission/bonus events into the local ledger so the
    // spendable balance reflects the backend. addReferralEarning is
    // idempotent per orderId, so re-syncing the same events is safe.
    if(Array.isArray(data?.events)){
      data.events.forEach(ev => {
        const amt = Math.floor((Number(ev.commission) || 0) + (Number(ev.firstPurchaseBonus) || 0));
        if(amt > 0 && ev.orderNumber){
          addReferralEarning(ev.orderNumber, ev.buyerId || ev.buyerName || null, amt);
        }
      });
    }
    persist();
    if(S.screen === "perfil") render();
  } catch(err){
    console.warn("[referral] summary fetch failed", err?.message || err);
  }
}

async function sharePerfilLink(){
  const code = (S.user.referralCode || "").trim().toUpperCase();
  const url = `${window.location.origin}/?ref=${encodeURIComponent(code)}`;
  const text = `Súmate al Mundial 26 conmigo. Te doy $${WELCOME_CREDIT_AMOUNT} de bienvenida en tu primera compra con mi código ${code}.`;
  if(navigator.share){
    try { await navigator.share({ title: "Mundial 26", text, url }); return; }
    catch(e){ if(e && e.name === "AbortError") return; }
  }
  copyText(url);
  toast("Link copiado");
}

/* Expose globals (onclick handlers reference these) */
Object.assign(window, { go, back, reset, cartAdd, cartSub, cartRm, cartClear, stickerInc, stickerStep, setAlbumSub, toggleAlbumSection, openQuickAdd, openStickerModal, closeModal, quickAddSubmit, reAddCode, openQAScanner, copyText, toast, S, buyAllMissing, openFillAlbumModal, confirmFillAlbum, openFillAlbumPickModal, fillPickToggle, fillPickToggleAll, fillPickClear, fillPickSearch, fillPickConfirm, dismissAlbumCta, missingPopupClose, missingPopupCta, renderSearchOnly, renderAlbumOnly, openScanIntent, toggleSwapSel, confirmSwap, finalizeSwap, submitCheckout, render, persist, setTheme, updateAddressStatus, requestUserLocation, setStatsRange, shareStats, sharePerfilLink, fetchReferralSummary, addReferralEarning, useReferralCredit, revertReferralCredit, toggleUseReferralCredit,
  // My Panini wizard
  mpNext, mpPrev, mpGotoStep, mpExitWizard, mpSetType, mpSetCountry, mpFilterCountries, mpHandlePhoto, mpHandleDrop, mpHandleDragOver, mpClearPhoto, mpCameraOpen, mpRequestBgRemoval, mpRunBgRemoval, mpRetryBgRemoval, mpUseOriginal, mpSkipBgStep, mpSetField, mpSetOffsetY, mpNudgeOffset, mpComplete, mpResetWizard,
  // Album export/import
  openExportAlbum, openImportAlbum, exportCopyCode, downloadAlbumExport, importSetMode, importHandlePasteInput, importApplyPaste, importHandleFile, importScanFromImage, importConfirmApply, importRetryScanner,
  // Settings + Perfil POS
  setAccent, toggleNotifReminders, setLanguage, logoutDemo, posSet, posSavePOS, posEditPOS,
  // Swap (real P2P)
  dismissSwapReceipt });

/* Apply persisted theme before first paint, then render */
applyTheme();
captureReferralFromUrl();
bootMpReturn().finally(() => {
  render();
  fetchReferralSummary();
  bootSwapSync();
});

/* =====================================================================
   SWAP SYNC (Supabase)
   - On boot, drain any pending swaps targeting this username (user was
     offline when peer confirmed) and apply each to the album.
   - Subscribe to realtime INSERTs for live sync.
   ===================================================================== */
async function applyRemoteSwap(row){
  if(!row || !row.id) return;
  // Translate the row into the receipt shape so we can reuse applySwapReceipt:
  // k = scanner took FROM me  → me -1; g = scanner gave TO me → me +1
  const result = applySwapReceipt({
    v: 1,
    t: "r",
    u: row.scanner_user || "",
    dn: row.scanner_name || "",
    k: Array.isArray(row.took) ? row.took : [],
    g: Array.isArray(row.gave) ? row.gave : [],
  });
  await markSwapApplied(row.id);
  const peer = row.scanner_user ? `@${row.scanner_user}` : "Tu amigo";
  if(result.received > 0 || result.gave > 0){
    toast(`${peer} hizo swap · +${result.received} / -${result.gave}`);
    if(S.screen === "album" || S.screen === "qr") render();
  }
}
let _swapUnsubscribe = null;
async function bootSwapSync(){
  if(!isSupabaseConfigured()) return;
  const me = S.user && S.user.username;
  if(!me) return;
  try {
    const pending = await fetchPendingSwaps(me);
    for(const row of pending){
      try { await applyRemoteSwap(row); }
      catch(err){ captureException(err, { tags: { mutation: "applyRemoteSwap" } }); }
    }
  } catch(err){
    captureException(err, { tags: { mutation: "bootSwapSync.fetch" } });
  }
  if(_swapUnsubscribe){ try { _swapUnsubscribe(); } catch(_){} _swapUnsubscribe = null; }
  _swapUnsubscribe = subscribeToSwaps(me, (row) => {
    applyRemoteSwap(row).catch(err => captureException(err, { tags: { mutation: "applyRemoteSwap.live" } }));
  });
}

/* =====================================================================
   SERVICE WORKER + UPDATE BANNER
   - Register on load (silent on failure: app works without SW).
   - When a new SW reaches `installed` AND a controller already exists,
     show a sticky banner asking the user to activate the new version.
   - Tap "Actualizar" → postMessage SKIP_WAITING; the SW calls skipWaiting(),
     `controllerchange` fires, and we reload. localStorage survives the reload.
   ===================================================================== */
function showSWUpdateBanner(waitingSW){
  if(document.getElementById("sw-update-banner")) return; // already shown
  const el = document.createElement("div");
  el.id = "sw-update-banner";
  el.className = "sw-update-banner";
  el.setAttribute("role", "status");
  el.setAttribute("aria-live", "polite");
  el.innerHTML = `
    <span class="sw-update-banner__msg">Nueva versión disponible</span>
    <button type="button" class="sw-update-banner__btn tap" id="sw-update-btn">Actualizar</button>
    <button type="button" class="sw-update-banner__close tap" id="sw-update-close" aria-label="Descartar">✕</button>
  `;
  document.body.appendChild(el);
  let reloading = false;
  document.getElementById("sw-update-btn").addEventListener("click", () => {
    if(reloading) return;
    reloading = true;
    el.querySelector(".sw-update-banner__btn").textContent = "Actualizando…";
    try { waitingSW.postMessage({ type: "SKIP_WAITING" }); }
    catch(_) { setTimeout(() => location.reload(), 300); }
  });
  document.getElementById("sw-update-close").addEventListener("click", () => el.remove());
}

// Skip SW on Vite dev server — its cache-first strategy serves stale CSS/JS
// during local dev and hides hot-reloaded changes. Also unregister any SW that
// was previously installed on localhost and clear its caches, then reload once
// so subsequent requests bypass the SW completely.
const __isDevHost = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
if(__isDevHost && 'serviceWorker' in navigator){
  (async () => {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      const hadSW = regs.length > 0;
      await Promise.all(regs.map((r) => r.unregister()));
      if(window.caches && caches.keys){
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      if(hadSW && !sessionStorage.getItem('__swCleared')){
        sessionStorage.setItem('__swCleared', '1');
        location.reload();
      }
    } catch(_) {}
  })();
}

if(!__isDevHost && 'serviceWorker' in navigator){
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then((reg) => {
      // SW already waiting when we registered (page survived across a deploy)
      if(reg.waiting && navigator.serviceWorker.controller){
        showSWUpdateBanner(reg.waiting);
      }
      reg.addEventListener("updatefound", () => {
        const installing = reg.installing;
        if(!installing) return;
        installing.addEventListener("statechange", () => {
          // Only prompt if a controller already existed — first-ever install
          // shouldn't trigger an "update" banner.
          if(installing.state === "installed" && navigator.serviceWorker.controller){
            showSWUpdateBanner(installing);
          }
        });
      });
    }).catch(() => {});

    let didReload = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if(didReload) return;
      didReload = true;
      window.location.reload();
    });
  });
}
