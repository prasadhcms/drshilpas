import { createClient } from '@supabase/supabase-js'

// Read from Vite env, fallback to the same defaults used by the mobile app
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://advtbhiiipubsvuowwwp.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkdnRiaGlpaXB1YnN2dW93d3dwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NDE4ODUsImV4cCI6MjA3MzAxNzg4NX0.pxD9v6C3lz_LXWaRh_hCD9jBoPzZgC067rK5xX2knFo'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

