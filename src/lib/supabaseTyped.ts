import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * A typed Supabase client for use in new code.
 * Existing code continues to use supabaseClient.ts to avoid breaking changes.
 */
export const supabaseTyped = createClient<Database>(url, key);
