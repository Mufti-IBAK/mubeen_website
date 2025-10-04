import { createClient } from '@supabase/supabase-js'

// Read from .env.local (or Vercel envs)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Provide a safe stub when env is missing to prevent dev crashes.
const makeStub = () => {
  const msg = 'Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.'
  const stubQuery = {
    select: async () => ({ data: null, error: { message: msg } }),
    single: async () => ({ data: null, error: { message: msg } }),
    insert: async () => ({ data: null, error: { message: msg } }),
    update: async () => ({ data: null, error: { message: msg } }),
    order: () => stubQuery,
    eq: () => stubQuery,
  }
  const stubAuth = {
    getSession: async () => ({ data: { session: null } }),
    onAuthStateChange: (_cb: unknown) => ({ data: { subscription: { unsubscribe: () => {} } } }),
    getUser: async () => ({ data: { user: null } }),
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { from: (_table: string) => stubQuery, auth: stubAuth } as any
}

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : makeStub()
