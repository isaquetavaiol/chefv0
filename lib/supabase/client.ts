import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let client: SupabaseClient | null = null

export function getBrowserSupabase() {
  if (typeof window === "undefined") {
    throw new Error("getBrowserSupabase must be used in the browser")
  }
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !anon) {
      // Fallback to non-prefixed vars if provided (dev environments)
      // Note: NEXT_PUBLIC_* are required for client usage.
      console.warn("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY")
    }
    client = createClient(url as string, anon as string)
  }
  return client
}
