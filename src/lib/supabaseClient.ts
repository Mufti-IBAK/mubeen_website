import { createClient } from '@supabase/supabase-js'

// Read from .env.local (or Vercel envs)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

type QueryResponse<T = unknown> = { data: T | null; error: { message: string } | null }
type QueryBuilder<T = unknown> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  select: (..._args: any[]) => Promise<QueryResponse<T>>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  single: (..._args: any[]) => Promise<QueryResponse<T>>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  insert: (..._args: any[]) => Promise<QueryResponse<T>>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  update: (..._args: any[]) => Promise<QueryResponse<T>>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  order: (..._args: any[]) => QueryBuilder<T>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  eq: (..._args: any[]) => QueryBuilder<T>
}

export type SupabaseLike = {
  // keep for reference, not enforced
  from: (_table: string) => any
  auth: {
    getSession: () => Promise<{ data: { session: any } }>
    onAuthStateChange: (_cb: any) => { data: { subscription: { unsubscribe: () => void } } }
    getUser: () => Promise<{ data: { user: any } }>
    signOut: () => Promise<void>
    signInWithPassword?: (_: any) => Promise<any>
    signUp?: (_: any) => Promise<any>
    resetPasswordForEmail?: (_: any) => Promise<any>
    exchangeCodeForSession?: (_: any) => Promise<any>
    signInWithOAuth?: (_: any) => Promise<any>
    signInWithOtp?: (_: any) => Promise<any>
    updateUser?: (_: any) => Promise<any>
  }
  storage?: any
}

// Provide a safe stub when env is missing to prevent dev crashes.
const makeStub = (): any => {
  const msg = 'Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.'
  const stubQuery: QueryBuilder = {
    select: async () => ({ data: null, error: { message: msg } }),
    single: async () => ({ data: null, error: { message: msg } }),
    insert: async () => ({ data: null, error: { message: msg } }),
    update: async () => ({ data: null, error: { message: msg } }),
    order: () => stubQuery,
    eq: () => stubQuery,
  }
  const stubAuth = {
    getSession: async () => ({ data: { session: null } }),
    onAuthStateChange: (_cb: any) => ({ data: { subscription: { unsubscribe: () => {} } } }),
    getUser: async () => ({ data: { user: null } }),
    signOut: async () => { /* no-op */ },
    signInWithPassword: async () => ({ data: null, error: { message: msg } }),
    signUp: async () => ({ data: null, error: { message: msg } }),
    resetPasswordForEmail: async () => ({ data: null, error: { message: msg } }),
    exchangeCodeForSession: async () => ({ data: null, error: { message: msg } }),
    signInWithOAuth: async () => ({ data: null, error: { message: msg } }),
    signInWithOtp: async () => ({ data: null, error: { message: msg } }),
    updateUser: async () => ({ data: null, error: { message: msg } }),
  }
  const stubStorage = {
    from: () => ({ upload: async () => ({ error: { message: msg } }), getPublicUrl: () => ({ data: { publicUrl: '' } }) }),
  }
  return { from: () => stubQuery, auth: stubAuth, storage: stubStorage }
}

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? (createClient(supabaseUrl, supabaseAnonKey) as unknown as any)
  : (makeStub() as any)
