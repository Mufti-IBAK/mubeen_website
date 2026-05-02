import { z } from 'zod';

/**
 * Validates essential environment variables at runtime.
 * This ensures the app fails fast with clear errors if misconfigured.
 */
const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY: z.string().min(1),
  // Server-side variables are validated individually in their respective routes
  // to avoid leaking them to the client if this file is imported in client components.
});

export const env = envSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY: process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY,
});
