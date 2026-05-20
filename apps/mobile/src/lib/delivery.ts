/**
 * Delivery zones, fees, and payment-method gating.
 * Rules per Pablo (May 2026):
 *   gdl       — Guadalajara local: free over $1,000 MXN, else $100
 *   nacional  — Mexico-wide: free over $2,500 MXN, else $200
 *   pickup    — Pick up at store: always free
 *
 * Card paid before-hand (Mercado Pago) is the only method for delivered orders.
 * Cash is only allowed on pickup, paid at the store.
 */
export type DeliveryZone = 'gdl' | 'nacional' | 'pickup'

export const DELIVERY_LABEL: Record<DeliveryZone, string> = {
  gdl: 'Guadalajara local',
  nacional: 'Mexico — nationwide',
  pickup: 'Pickup at store',
}

export const DELIVERY_SUB: Record<DeliveryZone, string> = {
  gdl: '1-3 business days',
  nacional: '2-5 business days',
  pickup: 'Ready in 24h',
}

const FREE_THRESHOLD: Record<DeliveryZone, number> = {
  gdl: 1000,
  nacional: 2500,
  pickup: 0,
}

const BASE_FEE: Record<DeliveryZone, number> = {
  gdl: 100,
  nacional: 200,
  pickup: 0,
}

export function deliveryFee(zone: DeliveryZone, subtotal: number): number {
  if (zone === 'pickup') return 0
  return subtotal >= FREE_THRESHOLD[zone] ? 0 : BASE_FEE[zone]
}

export function deliveryAmountToFreeShipping(zone: DeliveryZone, subtotal: number): number {
  if (zone === 'pickup') return 0
  const missing = FREE_THRESHOLD[zone] - subtotal
  return missing > 0 ? missing : 0
}

/**
 * Card-only across every zone (Pablo, May 2026). Cash was killed entirely —
 * delivery, pickup, everything routes through Mercado Pago paid before-hand.
 */
export type PaymentMethod = 'card'
export function paymentMethodsFor(_zone: DeliveryZone): PaymentMethod[] {
  return ['card']
}

/* ── Welcome + referral credits (Pablo's final mechanics, May 2026) ───────
 *
 *   Welcome credit:  $100 MXN off the user's first order (any size).
 *
 *   Referral:
 *     · Inviter earns 5% of the invitee's first purchase, credited only
 *       after that first purchase actually happens (anti-fraud guard).
 *     · Invitee gets $100 MXN off their first order, ONLY when that order
 *       is $1,000 MXN or more.
 */
export const WELCOME_CREDIT_MXN = 100

export const REFERRAL_INVITER_PCT = 0.05
export const REFERRAL_INVITEE_DISCOUNT_MXN = 100
export const REFERRAL_INVITEE_MIN_ORDER_MXN = 1000

export function referralInviteeDiscount(orderSubtotal: number): number {
  return orderSubtotal >= REFERRAL_INVITEE_MIN_ORDER_MXN ? REFERRAL_INVITEE_DISCOUNT_MXN : 0
}

export function referralInviterReward(inviteeFirstPurchaseSubtotal: number): number {
  return Math.round(inviteeFirstPurchaseSubtotal * REFERRAL_INVITER_PCT)
}

/** Caps referral credit at the order subtotal AFTER welcome credit is applied. */
export function maxReferralApplied(subtotal: number, welcomeApplied: number, balance: number): number {
  const headroom = Math.max(0, subtotal - welcomeApplied)
  return Math.min(headroom, balance)
}
