import { createClient } from '@supabase/supabase-js'

/**
 * Minimal server-side Supabase client.
 * Uses the public anon key for read-only operations in server components.
 */
export function supabaseServer() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )
}
