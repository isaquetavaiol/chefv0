"use client"

import { useEffect, useState } from "react"
import { getBrowserSupabase } from "@/lib/supabase/client"
import type { Session, User } from "@supabase/supabase-js"

type SessionState = {
  user: User | null
  session: Session | null
  loading: boolean
}

export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({ user: null, session: null, loading: true })

  useEffect(() => {
    const supabase = getBrowserSupabase()
    let mounted = true

    async function init() {
      const { data } = await supabase.auth.getSession()
      if (!mounted) return
      setState({ user: data.session?.user ?? null, session: data.session ?? null, loading: false })
    }
    init()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ user: session?.user ?? null, session: session ?? null, loading: false })
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  return state
}
