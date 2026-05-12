import * as SecureStore from 'expo-secure-store'

const AT_KEY = 'pablo-at'
const RT_KEY = 'pablo-rt'

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

export function getTokenExpiry(token: string): number {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1]!, 'base64').toString(),
    ) as { exp?: number }
    return (payload.exp ?? 0) * 1000
  } catch {
    return 0
  }
}
