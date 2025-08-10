import { createClient } from "@supabase/supabase-js"

export function getAdminClient() {
  const url = process.env.SUPABASE_URL
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !service) {
    throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set")
  }
  return createClient(url, service)
}
