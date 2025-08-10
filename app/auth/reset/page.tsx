"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { getBrowserSupabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function ResetPasswordPage() {
  const supabase = getBrowserSupabase()
  const [status, setStatus] = useState<"checking" | "ready" | "updating" | "done" | "error">("checking")
  const [message, setMessage] = useState("Validando link...")
  const [pass, setPass] = useState("")
  const [pass2, setPass2] = useState("")

  useEffect(() => {
    async function init() {
      try {
        // Garante a sessão de recuperação a partir do link
        const { error } = await supabase.auth.exchangeCodeForSession(window.location.href)
        if (error) throw error
        setStatus("ready")
      } catch (e: any) {
        setStatus("error")
        setMessage(e?.message || "Link inválido ou expirado.")
      }
    }
    init()
  }, [supabase])

  async function updatePassword(e: React.FormEvent) {
    e.preventDefault()
    if (pass.length < 6) {
      setMessage("A senha deve ter ao menos 6 caracteres.")
      setStatus("error")
      return
    }
    if (pass !== pass2) {
      setMessage("As senhas não conferem.")
      setStatus("error")
      return
    }
    setStatus("updating")
    setMessage("Atualizando senha...")
    try {
      const { error } = await supabase.auth.updateUser({ password: pass })
      if (error) throw error
      setStatus("done")
      setMessage("Senha atualizada. Redirecionando...")
      setTimeout(() => (window.location.href = "/"), 1200)
    } catch (e: any) {
      setStatus("error")
      setMessage(e?.message || "Não foi possível atualizar a senha.")
    }
  }

  return (
    <main className="min-h-[80dvh] flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Redefinir senha</CardTitle>
          <CardDescription>Defina uma nova senha para sua conta.</CardDescription>
        </CardHeader>
        <CardContent>
          {status === "checking" && (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" /> {message}
            </p>
          )}
          {status === "ready" && (
            <form onSubmit={updatePassword} className="grid gap-3">
              <div className="grid gap-2">
                <Label htmlFor="pass">Nova senha</Label>
                <Input
                  id="pass"
                  type="password"
                  minLength={6}
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pass2">Confirmar senha</Label>
                <Input
                  id="pass2"
                  type="password"
                  minLength={6}
                  value={pass2}
                  onChange={(e) => setPass2(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={status === "updating"}>
                {status === "updating" ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Atualizar senha
              </Button>
            </form>
          )}
          {status === "done" && <p className="text-sm text-muted-foreground">{message}</p>}
          {status === "error" && <p className="text-sm text-red-600">{message}</p>}
        </CardContent>
      </Card>
    </main>
  )
}
