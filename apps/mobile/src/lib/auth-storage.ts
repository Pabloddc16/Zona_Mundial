import * as SecureStore from 'expo-secure-store'

const AT_KEY = 'pablo-at'
const RT_KEY = 'pablo-rt'
const USER_KEY = 'pablo-user'

export async function getCachedUser<T>(): Promise<T | null> {
  try {
    const raw = await SecureStore.getItemAsync(USER_KEY)
    return raw ? (JSON.parse(raw) as T) : null
  } catch { return null }
}
export async function setCachedUser<T>(u: T | null): Promise<void> {
  if (u) await SecureStore.setItemAsync(USER_KEY, JSON.stringify(u))
  else await SecureStore.deleteItemAsync(USER_KEY).catch(() => {})
}

export async function getAT(): Promise<string | null> {
  try { return await SecureStore.getItemAsync(AT_KEY) } catch { return null }
}
export async function getRT(): Promise<string | null> {
  try { return await SecureStore.getItemAsync(RT_KEY) } catch { return null }
}
export async function setAT(token: string | null): Promise<void> {
  if (token) await SecureStore.setItemAsync(AT_KEY, token)
  else await SecureStore.deleteItemAsync(AT_KEY).catch(() => {})
}
export async function setRT(token: string | null): Promise<void> {
  if (token) await SecureStore.setItemAsync(RT_KEY, token)
  else await SecureStore.deleteItemAsync(RT_KEY).catch(() => {})
}
export async function clearTokens(): Promise<void> {
  await Promise.all([setAT(null), setRT(null)])
}

function base64UrlDecode(b64: string): string {
  // JWT uses base64url — restore padding + standard chars then atob
  const std = b64.replace(/-/g, '+').replace(/_/g, '/')
  const pad = std.length % 4 === 0 ? std : std + '='.repeat(4 - (std.length % 4))
  // atob is globally available in modern React Native (Hermes 0.71+)
  return atob(pad)
}

export function getTokenExpiry(token: string): number {
  try {
    const parts = token.split('.')
    if (parts.length < 2) return 0
    const payload = JSON.parse(base64UrlDecode(parts[1]!)) as { exp?: number }
    return (payload.exp ?? 0) * 1000
  } catch {
    return 0
  }
}
