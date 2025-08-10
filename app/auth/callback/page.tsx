"use client"

import { useEffect, useState } from "react"
import { getBrowserSupabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

export default function AuthCallbackPage() {
  const [status, setStatus] = useState<"working" | "ok" | "error">("working")
  const [message, setMessage] = useState("Finalizando login...")

  useEffect(() => {
    async function run() {
      try {
        const supabase = getBrowserSupabase()
        const { error } = await supabase.auth.exchangeCodeForSession(window.location.href)
        if (error) throw error
        setStatus("ok")
        setMessage("Login realizado com sucesso. Redirecionando...")
        setTimeout(() => {
          window.location.replace("/")
        }, 800)
      } catch (e: any) {
        setStatus("error")
        setMessage(e?.message || "Não foi possível finalizar o login.")
      }
    }
    run()
  }, [])

  return (
    <main className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="max-w-sm text-center">
        {status === "working" && <Loader2 className="mx-auto mb-3 size-6 animate-spin" />}
        <p className="text-sm text-muted-foreground">{message}</p>
        {status === "error" && (
          <Button className="mt-4" onClick={() => (window.location.href = "/")}>
            Voltar
          </Button>
        )}
      </div>
    </main>
  )
}
