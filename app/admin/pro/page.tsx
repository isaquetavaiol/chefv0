"use client"

import { useEffect, useMemo, useState } from "react"
import { useSession } from "@/hooks/use-session"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { ShieldCheck, ShieldOff, UserSearch, Loader2, Plus, RotateCcw, Check } from "lucide-react"
import { ADMIN_EMAILS } from "@/lib/admin"

type UserRow = {
  id: string
  email: string
  plan: "pro" | "freemium"
  credits: number
}

export default function AdminProPage() {
  const { user, session, loading } = useSession()
  const { toast } = useToast()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<UserRow[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)
  const [searching, setSearching] = useState(false)
  const [amountByUser, setAmountByUser] = useState<Record<string, number>>({})

  const isAdmin = useMemo(() => {
    const email = user?.email?.toLowerCase() || ""
    // Admin pela allowlist de e-mails OU app_metadata.admin/role (tratado no backend)
    return email && ADMIN_EMAILS.map((e) => e.toLowerCase().trim()).includes(email)
  }, [user])

  useEffect(() => {
    document.title = "Admin Pro • V0 Chef"
  }, [])

  async function search() {
    if (!session?.access_token) return
    setSearching(true)
    setResults([])
    try {
      const url = `/api/admin/pro/search?query=${encodeURIComponent(query)}`
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) throw new Error(await res.text())
      const data = (await res.json()) as UserRow[]
      setResults(data)
      if (data.length === 0) {
        toast({ description: "Nenhum usuário encontrado para este e‑mail." })
      }
    } catch (e: any) {
      toast({ variant: "destructive", description: e?.message || "Falha ao buscar usuários." })
    } finally {
      setSearching(false)
    }
  }

  async function assignPlan(userId: string, plan: "pro" | "freemium") {
    if (!session?.access_token) return
    setBusyId(userId)
    try {
      const res = await fetch("/api/admin/pro/assign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ userId, plan }),
      })
      if (!res.ok) throw new Error(await res.text())
      toast({ description: plan === "pro" ? "Plano Pro concedido." : "Plano Pro removido." })
      setResults((list) => list.map((u) => (u.id === userId ? { ...u, plan } : u)))
    } catch (e: any) {
      toast({ variant: "destructive", description: e?.message || "Não foi possível atualizar o plano." })
    } finally {
      setBusyId(null)
    }
  }

  async function updateCredits(userId: string, op: "add" | "set" | "reset", amount?: number) {
    if (!session?.access_token) return
    setBusyId(userId)
    try {
      const res = await fetch("/api/admin/credits/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ userId, op, amount }),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = (await res.json()) as { credits: number }
      setResults((list) => list.map((u) => (u.id === userId ? { ...u, credits: data.credits } : u)))
      toast({ description: "Créditos atualizados." })
    } catch (e: any) {
      toast({ variant: "destructive", description: e?.message || "Não foi possível atualizar os créditos." })
    } finally {
      setBusyId(null)
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center p-6">
        <Loader2 className="size-6 animate-spin" />
      </main>
    )
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <Card>
          <CardHeader>
            <CardTitle>Admin Pro</CardTitle>
            <CardDescription>Entre na sua conta para continuar.</CardDescription>
          </CardHeader>
        </Card>
      </main>
    )
  }

  if (!isAdmin) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <Card>
          <CardHeader>
            <CardTitle>Acesso restrito</CardTitle>
            <CardDescription>Esta página é exclusiva do administrador.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldOff className="size-4" />
            {user.email}
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-4xl p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5" />
            Admin Pro
          </CardTitle>
          <CardDescription>Defina quem terá acesso ao plano Pro e gerencie créditos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <section className="space-y-2">
            <Label htmlFor="email">Buscar por e‑mail</Label>
            <div className="flex gap-2">
              <Input
                id="email"
                placeholder="usuario@exemplo.com"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && search()}
              />
              <Button onClick={search} disabled={searching || !query.trim()}>
                {searching ? <Loader2 className="mr-2 size-4 animate-spin" /> : <UserSearch className="mr-2 size-4" />}
                Buscar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Pesquise e ajuste plano/créditos dos usuários.</p>
          </section>

          {results.length > 0 && (
            <div className="space-y-3">
              {results.map((u) => (
                <div key={u.id} className="flex flex-col gap-3 rounded-lg border p-3 lg:flex-row lg:items-center">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{u.email}</span>
                      <Badge variant={u.plan === "pro" ? "default" : "secondary"}>{u.plan}</Badge>
                      <Badge variant="outline">Créditos: {u.credits}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">id: {u.id}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      value={u.plan}
                      onValueChange={(v) => assignPlan(u.id, v as "pro" | "freemium")}
                      disabled={busyId === u.id}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Plano" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="freemium">Freemium</SelectItem>
                        <SelectItem value="pro">Pro</SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        className="w-24"
                        placeholder="Qtd"
                        value={amountByUser[u.id] ?? ""}
                        onChange={(e) => setAmountByUser((m) => ({ ...m, [u.id]: Number(e.target.value || 0) }))}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busyId === u.id || !Number(amountByUser[u.id])}
                        onClick={() => updateCredits(u.id, "add", Number(amountByUser[u.id] || 0))}
                      >
                        <Plus className="mr-1 size-4" />
                        Adicionar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busyId === u.id || (amountByUser[u.id] ?? Number.NaN) < 0}
                        onClick={() => updateCredits(u.id, "set", Math.max(0, Number(amountByUser[u.id] || 0)))}
                      >
                        <Check className="mr-1 size-4" />
                        Definir
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busyId === u.id}
                        onClick={() => updateCredits(u.id, "reset")}
                      >
                        <RotateCcw className="mr-1 size-4" />
                        Zerar
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
