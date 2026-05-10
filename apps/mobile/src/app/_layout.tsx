import { Stack } from 'expo-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useEffect } from 'react'
import { registerForPushNotifications } from '@/lib/notifications'
import { useProductsStore } from '@/lib/products-store'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

const API = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:4000'

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
          <Stack screenOptions={{ headerShown: false }} />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
