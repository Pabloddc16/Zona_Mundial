/**
 * Supabase client for Cromos 26 mobile.
 * Uses AsyncStorage for session persistence (RN-friendly, survives app restart).
 * URL polyfill required because RN lacks WHATWG URL by default.
 */
import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL =
  process.env['EXPO_PUBLIC_SUPABASE_URL'] ??
  'https://skjlfwgmfaysrdtprrvc.supabase.co'

const SUPABASE_ANON_KEY =
  process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNramxmd2dtZmF5c3JkdHBycnZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NzM1MDQsImV4cCI6MjA5MzI0OTUwNH0.Up8Z5pFmOBfL6vjkRDWMdxiSRpXbw4TDpkkUUdRoynU'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
