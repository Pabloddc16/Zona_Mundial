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
  const guest = useAuthStore((s) => s.guest)
  const hydrated = useAuthStore((s) => s.hydrated)
  const loadFromToken = useAuthStore((s) => s.loadFromToken)

  useEffect(() => { loadFromToken() }, [loadFromToken])

  useEffect(() => {
    if (!hydrated) return
    const inAuth = segments[0] === '(auth)'
    // Apple Guideline 5.1.1(v): browse without signing in. Welcome screen
    // exposes a "Continuar como invitado" button that sets guest=true; from
    // that point the user lands on the main tabs (album + tienda are fully
    // browsable). Account-gated screens (cart, checkout, profile) render
    // their own sign-in prompts.
    if (!user && !guest && !inAuth) router.replace('/welcome')
    else if (user && inAuth) router.replace('/')
  }, [hydrated, user, guest, segments, router])

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
