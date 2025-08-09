import { createClient } from '@supabase/supabase-js'

// These variables are pulled from your .env.local file
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// The '!' tells TypeScript that we are certain these environment variables exist.
// The app would not function without them, so this is a safe assertion.

export const supabase = createClient(supabaseUrl, supabaseAnonKey)