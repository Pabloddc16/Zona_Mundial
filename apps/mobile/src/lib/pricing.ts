/**
 * Pricing matrix for Stars shop SKUs (MXN). Source: master spec, Section 6.
 *   BASE   — entry tier
 *   BRONCE — rare
 *   PLATA  — very rare
 *   ORO    — extremely rare (foil + numbered)
 */
import type { StarTier } from './star-players'

export type StarRarity = 'BASE' | 'BRONCE' | 'PLATA' | 'ORO'

export const STAR_RARITIES: StarRarity[] = ['BASE', 'BRONCE', 'PLATA', 'ORO']

export const STAR_PRICING: Record<StarTier, Record<StarRarity, number>> = {
  GOAT:  { BASE: 500, BRONCE: 800, PLATA: 5000, ORO: 10000 },
  CRACK: { BASE: 300, BRONCE: 500, PLATA: 3000, ORO: 4000 },
  STAR:  { BASE: 100, BRONCE: 200, PLATA: 1500, ORO: 2500 },
}

export function priceFor(tier: StarTier, rarity: StarRarity): number {
  return STAR_PRICING[tier][rarity]
}

export const RARITY_DISPLAY: Record<StarRarity, { label: string; color: string; bg: string }> = {
  BASE:   { label: 'Base',   color: '#0B1F15', bg: '#FAF6EE' },
  BRONCE: { label: 'Bronze', color: '#7A4A1F', bg: '#F5E3D2' },
  PLATA:  { label: 'Silver', color: '#4B5563', bg: '#EEF2F6' },
  ORO:    { label: 'Gold',   color: '#806100', bg: '#FFF8DC' },
}
