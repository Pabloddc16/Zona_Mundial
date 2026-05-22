import { Stack, useRouter, useSegments } from 'expo-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useEffect } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { registerForPushNotifications } from '@/lib/notifications'
import { useProductsStore } from '@/lib/products-store'
import { useAuthStore } from '@/lib/auth-store'
import { COLORS } from '@/lib/theme'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

const API = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:4000'

function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const segments = useSegments()
  const user = useAuthStore((s) => s.user)
  const hydrated = useAuthStore((s) => s.hydrated)
  const loadFromToken = useAuthStore((s) => s.loadFromToken)

  useEffect(() => { loadFromToken() }, [loadFromToken])

  useEffect(() => {
    if (!hydrated) return
    const inAuth = segments[0] === '(auth)'
    if (!user && !inAuth) router.replace('/welcome')
    else if (user && inAuth) router.replace('/')
  }, [hydrated, user, segments, router])

  if (!hydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.cream }}>
        <ActivityIndicator color={COLORS.green} />
      </View>
    )
  }
  return <>{children}</>
}

export default function RootLayout() {
  const fetchProducts = useProductsStore((s) => s.fetch)

  useEffect(() => {
    registerForPushNotifications().catch(() => {})
    fetchProducts(API)
  }, [fetchProducts])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthGate>
            <Stack screenOptions={{ headerShown: false }} />
          </AuthGate>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
