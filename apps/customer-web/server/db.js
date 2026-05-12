import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || resolve(here, "./data/db.json");
const EMPTY = { orders: [], referralEvents: [] };
export const COMMISSION_RATE = 0.10;
export const REFERRER_FIRST_PURCHASE_BONUS = 100;

let cache = null;
let writing = Promise.resolve();

async function ensureDir(){
  const d = dirname(DB_PATH);
  if(!existsSync(d)) await mkdir(d, { recursive: true });
}

async function load(){
  if(cache) return cache;
  await ensureDir();
  try {
    const raw = await readFile(DB_PATH, "utf8");
    cache = JSON.parse(raw);
    if(!cache || !Array.isArray(cache.orders)) cache = { ...EMPTY };
    if(!Array.isArray(cache.referralEvents)) cache.referralEvents = [];
  } catch {
    cache = { ...EMPTY, referralEvents: [] };
  }
  return cache;
}

async function flush(){
  // Serialize writes to avoid interleaving on concurrent webhook + create.
  writing = writing.then(async () => {
    await ensureDir();
    await writeFile(DB_PATH, JSON.stringify(cache, null, 2), "utf8");
  });
  return writing;
}

let counter = 0;
export async function nextOrderNumber(){
  const db = await load();
  // Largest existing numeric suffix + 1, starting at 2200 to match seeded demo data.
  if(counter === 0){
    const max = db.orders.reduce((m, o) => {
      const n = parseInt(String(o.orderNumber).replace(/\D/g, ""), 10);
      return Number.isFinite(n) && n > m ? n : m;
    }, 2199);
    counter = max;
  }
  counter += 1;
  return `ORD-${counter}`;
}

export async function createOrder(order){
  const db = await load();
  db.orders.unshift(order);
  await flush();
  return order;
}

export async function findOrder(orderNumber){
  const db = await load();
  return db.orders.find(o => o.orderNumber === orderNumber) || null;
}

export async function updateOrder(orderNumber, patch){
  const db = await load();
  const o = db.orders.find(x => x.orderNumber === orderNumber);
  if(!o) return null;
  Object.assign(o, patch, { updatedAt: new Date().toISOString() });
  await flush();
  return o;
}

export async function findOrderByPreference(preferenceId){
  const db = await load();
  return db.orders.find(o => o.preferenceId === preferenceId) || null;
}

export async function recordReferralEvent({ referrerCode, orderNumber, buyerName, buyerPhone, orderTotal }){
  if(!referrerCode || !orderNumber) return null;
  const db = await load();
  if(db.referralEvents.some(e => e.orderNumber === orderNumber)){
    return null; // Idempotent: never double-credit a single order.
  }
  const norm = String(referrerCode).trim().toUpperCase();
  const phoneKey = String(buyerPhone || "").replace(/\D/g, "");
  const isFirstFromBuyer = !!phoneKey && !db.referralEvents.some(e => e.referrerCode === norm && e.buyerPhone === phoneKey);
  const commission = Math.round(orderTotal * COMMISSION_RATE * 100) / 100;
  const firstPurchaseBonus = isFirstFromBuyer ? REFERRER_FIRST_PURCHASE_BONUS : 0;
  const event = {
    id: `RE-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
    referrerCode: norm,
    orderNumber,
    buyerName: buyerName || "Cliente",
    buyerPhone: phoneKey,
    orderTotal,
    commission,
    firstPurchaseBonus,
    rate: COMMISSION_RATE,
    createdAt: new Date().toISOString(),
  };
  db.referralEvents.unshift(event);
  await flush();
  return event;
}

export async function getReferralSummary(code){
  const db = await load();
  const norm = String(code || "").trim().toUpperCase();
  if(!norm) return { code: norm, balance: 0, totalReferred: 0, events: [] };
  const events = db.referralEvents.filter(e => e.referrerCode === norm);
  const balance = events.reduce((s, e) => s + (Number(e.commission) || 0) + (Number(e.firstPurchaseBonus) || 0), 0);
  const totalReferred = events.reduce((s, e) => s + (Number(e.orderTotal) || 0), 0);
  return { code: norm, balance: Math.round(balance * 100) / 100, totalReferred, events: events.slice(0, 50) };
}
