import { Tabs } from 'expo-router'
import { Platform } from 'react-native'
import { useCartStore, cartCount } from '@/lib/cart-store'
import { Ionicons } from '@expo/vector-icons'

const VERDE = '#006341'
const GRAY = '#9CA3AF'

export default function TabsLayout() {
  const cart = useCartStore((s) => s.cart)
  const count = cartCount(cart)

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: VERDE,
        tabBarInactiveTintColor: GRAY,
        tabBarStyle: {
          borderTopColor: '#F3F4F6',
          elevation: 0,
          shadowOpacity: 0,
          height: Platform.OS === 'ios' ? 84 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Album', tabBarIcon: ({ color, size }) => <Ionicons name="book-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="tienda"
        options={{ title: 'Store', tabBarIcon: ({ color, size }) => <Ionicons name="storefront-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="stats"
        options={{ title: 'Stats', tabBarIcon: ({ color, size }) => <Ionicons name="bar-chart-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="swap"
        options={{ title: 'Swap', tabBarIcon: ({ color, size }) => <Ionicons name="qr-code-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="carrito"
        options={{
          title: 'Cart',
          tabBarIcon: ({ color, size }) => <Ionicons name="cart-outline" size={size} color={color} />,
          tabBarBadgeStyle: { backgroundColor: '#CE1126', fontSize: 10 },
          ...(count > 0 ? { tabBarBadge: count } : {}),
        }}
      />
    </Tabs>
  )
}
