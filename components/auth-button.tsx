"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { getBrowserSupabase } from "@/lib/supabase/client"
import { useSession } from "@/hooks/use-session"
import { Loader2, LogOut, Lock, Mail, User2 } from "lucide-react"

export function AuthButton() {
  const supabase = getBrowserSupabase()
  const { toast } = useToast()
  const { user, loading } = useSession()

  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<"entrar" | "criar">("entrar")

  // Entrar
  const [emailIn, setEmailIn] = useState("")
  const [passIn, setPassIn] = useState("")
  const [loadingIn, setLoadingIn] = useState(false)

  // Criar conta
  const [emailUp, setEmailUp] = useState("")
  const [passUp, setPassUp] = useState("")
  const [passUp2, setPassUp2] = useState("")
  const [loadingUp, setLoadingUp] = useState(false)

  async function signInPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!emailIn || !passIn) return
    setLoadingIn(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: emailIn, password: passIn })
      if (error) throw error
      toast({ description: "Login realizado com sucesso." })
      setOpen(false)
    } catch (err: any) {
      toast({
        variant: "destructive",
        description: err?.message || "Não foi possível fazer login.",
      })
    } finally {
      setLoadingIn(false)
    }
  }

  async function signUpPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!emailUp || !passUp) return
    if (passUp !== passUp2) {
      toast({ variant: "destructive", description: "As senhas não conferem." })
      return
    }
    setLoadingUp(true)
    try {
      const redirectTo = `${window.location.origin}/auth/reset`
      const { error, data } = await supabase.auth.signUp({
        email: emailUp,
        password: passUp,
        options: { emailRedirectTo: redirectTo },
      })
      if (error) throw error
      // Se confirmação de e-mail estiver habilitada, não haverá sessão imediata
      if (!data.session) {
        toast({
          description: "Conta criada. Verifique seu e‑mail para confirmar o cadastro.",
        })
      } else {
        toast({ description: "Conta criada e login realizado." })
      }
      setOpen(false)
    } catch (err: any) {
      toast({
        variant: "destructive",
        description: err?.message || "Não foi possível criar sua conta.",
      })
    } finally {
      setLoadingUp(false)
    }
  }

  async function forgotPassword() {
    if (!emailIn) {
      toast({ description: "Informe seu e‑mail no campo acima para redefinir a senha." })
      return
    }
    try {
      const redirectTo = `${window.location.origin}/auth/reset`
      const { error } = await supabase.auth.resetPasswordForEmail(emailIn, {
        redirectTo,
      })
      if (error) throw error
      toast({ description: "Enviamos um e‑mail para redefinir sua senha." })
    } catch (err: any) {
      toast({
        variant: "destructive",
        description: err?.message || "Não foi possível enviar o e‑mail de redefinição.",
      })
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  // Estado de carregamento da sessão
  if (loading) {
    return (
      <Button variant="outline" size="icon" aria-label="Carregando sessão" disabled>
        <Loader2 className="size-4 animate-spin" />
      </Button>
    )
  }

  if (user) {
    const initial = user.email?.[0]?.toUpperCase() || "U"
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="h-9 w-9 p-0 rounded-full bg-transparent" aria-label="Menu do usuário">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-sm">
              {initial}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="flex items-center gap-2">
            <User2 className="size-4" />
            {user.email}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={signOut} className="cursor-pointer">
            <LogOut className="mr-2 size-4" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  // Sem sessão: dialog com tabs Entrar / Criar conta
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Entrar</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Acessar sua conta</DialogTitle>
          <DialogDescription>Use e‑mail e senha para entrar ou criar uma conta.</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="entrar">Entrar</TabsTrigger>
            <TabsTrigger value="criar">Criar conta</TabsTrigger>
          </TabsList>

          <TabsContent value="entrar" className="mt-4">
            <form onSubmit={signInPassword} className="grid gap-3">
              <div className="grid gap-2">
                <Label htmlFor="email-in">E‑mail</Label>
                <div className="flex items-center gap-2">
                  <Mail className="size-4 text-muted-foreground" />
                  <Input
                    id="email-in"
                    type="email"
                    placeholder="voce@exemplo.com"
                    value={emailIn}
                    onChange={(e) => setEmailIn(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pass-in">Senha</Label>
                <div className="flex items-center gap-2">
                  <Lock className="size-4 text-muted-foreground" />
                  <Input
                    id="pass-in"
                    type="password"
                    placeholder="••••••••"
                    value={passIn}
                    onChange={(e) => setPassIn(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Button type="submit" disabled={loadingIn}>
                  {loadingIn ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                  Entrar
                </Button>
                <Button type="button" variant="link" className="px-0" onClick={forgotPassword}>
                  Esqueci minha senha
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                No plano freemium você tem até 25 prompts/mês. No Pro, uso ilimitado.
              </p>
            </form>
          </TabsContent>

          <TabsContent value="criar" className="mt-4">
            <form onSubmit={signUpPassword} className="grid gap-3">
              <div className="grid gap-2">
                <Label htmlFor="email-up">E‑mail</Label>
                <div className="flex items-center gap-2">
                  <Mail className="size-4 text-muted-foreground" />
                  <Input
                    id="email-up"
                    type="email"
                    placeholder="voce@exemplo.com"
                    value={emailUp}
                    onChange={(e) => setEmailUp(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pass-up">Senha</Label>
                <div className="flex items-center gap-2">
                  <Lock className="size-4 text-muted-foreground" />
                  <Input
                    id="pass-up"
                    type="password"
                    placeholder="Mínimo de 6 caracteres"
                    value={passUp}
                    onChange={(e) => setPassUp(e.target.value)}
                    required
                    autoComplete="new-password"
                    minLength={6}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pass-up2">Confirmar senha</Label>
                <div className="flex items-center gap-2">
                  <Lock className="size-4 text-muted-foreground" />
                  <Input
                    id="pass-up2"
                    type="password"
                    placeholder="Repita a senha"
                    value={passUp2}
                    onChange={(e) => setPassUp2(e.target.value)}
                    required
                    autoComplete="new-password"
                    minLength={6}
                  />
                </div>
              </div>
              <Button type="submit" disabled={loadingUp}>
                {loadingUp ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Criar conta
              </Button>
              <p className="text-xs text-muted-foreground">
                Você poderá confirmar o cadastro pelo e‑mail, conforme configuração do projeto.
              </p>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
