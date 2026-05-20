import { Tabs } from 'expo-router'
import { Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COLORS } from '@/lib/theme'

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.green,
        tabBarInactiveTintColor: '#9CA3AF',
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
        options={{ title: 'Stats', tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="swap"
        options={{ title: 'Trade', tabBarIcon: ({ color, size }) => <Ionicons name="sync-circle-outline" size={size} color={color} /> }}
      />

      {/* Hidden routes — Settings is reached via gear icon in screen headers;
          Cart is reached from inside Store. */}
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="carrito" options={{ href: null }} />
    </Tabs>
  )
}
