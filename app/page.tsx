"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Bookmark, Download, Heart, RefreshCw, Settings, Star, Timer, Users, ShieldCheck } from "lucide-react"
import { generateRecipe, type RecipeInput, type Recipe } from "@/lib/recipe"
import { getMonthlyKey, loadAppState, saveAppState, type AppState, defaultAppState } from "@/lib/storage"
import { cn } from "@/lib/utils"
import { AuthButton } from "@/components/auth-button"
import Link from "next/link"
import { useSession } from "@/hooks/use-session"
import { isAdminUser } from "@/lib/admin"
import { useToast } from "@/hooks/use-toast"

type Plan = "freemium" | "pro"

export default function Page() {
  const { user, session } = useSession()
  const isAdmin = isAdminUser(user as any)
  const { toast } = useToast()

  const [state, setState] = useState<AppState>(defaultAppState)
  const [plan, setPlan] = useState<Plan>("freemium")
  const [loading, setLoading] = useState(false)
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [format, setFormat] = useState<"resumo" | "detalhado" | "impressao">("resumo")
  const [styleOption, setStyleOption] = useState<"rápido" | "saudável" | "comfort food" | "gourmet" | "sobras" | "">("")
  const [ingredients, setIngredients] = useState("")
  const [servings, setServings] = useState<number>(2)
  const [restrictions, setRestrictions] = useState("")
  const [utensils, setUtensils] = useState("")
  const ingredientsRef = useRef<HTMLTextAreaElement | null>(null)

  // Load state from localStorage (per month reset)
  useEffect(() => {
    const key = getMonthlyKey()
    const loaded = loadAppState(key)
    setState(loaded)
    setPlan(loaded.plan)
  }, [])

  // Save whenever changes
  useEffect(() => {
    const key = getMonthlyKey()
    saveAppState(key, { ...state, plan })
  }, [state, plan])

  // Sync plan and credits from Supabase metadata for logged users
  useEffect(() => {
    const p = (user?.app_metadata?.plan as "pro" | "freemium" | undefined) || "freemium"
    const credits = Number(user?.app_metadata?.credits ?? state.credits)
    setPlan(p)
    setState((s) => ({ ...s, credits }))
  }, [user])

  const remaining = useMemo(() => {
    if (plan === "freemium") {
      return Math.max(0, state.freeLimit - state.promptsUsed)
    }
    return Number.POSITIVE_INFINITY
  }, [plan, state.freeLimit, state.promptsUsed])

  const canGenerate = useMemo(() => {
    if (plan === "pro") return true
    if (plan === "freemium") return remaining > 0 || state.credits > 0
    return false
  }, [plan, remaining, state.credits])

  function handleNew() {
    setRecipe(null)
    setIngredients("")
    setRestrictions("")
    setUtensils("")
    setStyleOption("")
    setFormat("resumo")
    setServings(2)
    requestAnimationFrame(() => ingredientsRef.current?.focus())
  }

  async function spendOneCredit() {
    // Otimista no front
    setState((s) => ({ ...s, credits: Math.max(0, s.credits - 1) }))
    toast({ description: `–1 crédito (restam ${state.credits - 1}).` })

    // Se logado, desconta também no servidor
    if (session?.access_token) {
      try {
        const res = await fetch("/api/me/credits/spend", {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setState((s) => ({ ...s, credits: Number(data.credits ?? s.credits) }))
        }
      } catch {
        // silencioso; manter valor otimista
      }
    }
  }

  function willExceedFree() {
    return plan === "freemium" && remaining <= 0
  }

  async function onGenerate() {
    if (!ingredients.trim()) {
      toast({ variant: "destructive", description: "Adicione ao menos um ingrediente." })
      return
    }
    if (!canGenerate) {
      if (plan === "freemium") {
        toast({
          description:
            "🍳 Ei, chef! Você já usou seus 25 prompts grátis. Faça upgrade para o V0 Pro e cozinhe sem limites.",
        })
      } else {
        toast({ description: "Sem créditos suficientes. Adicione créditos ou faça upgrade para o Pro." })
      }
      return
    }

    setLoading(true)
    try {
      const input: RecipeInput = {
        ingredients,
        servings,
        restrictions,
        utensils,
        style: (styleOption || undefined) as RecipeInput["style"],
        format,
        pro: plan === "pro",
      }

      if (willExceedFree() && state.credits > 0) {
        await spendOneCredit()
      } else if (plan === "freemium" && remaining > 0) {
        setState((s) => ({ ...s, promptsUsed: s.promptsUsed + 1 }))
      }

      const r = await generateRecipe(input)
      setRecipe(r)
    } catch (e) {
      console.error(e)
      toast({ variant: "destructive", description: "Falha ao gerar a receita. Tente novamente." })
    } finally {
      setLoading(false)
    }
  }

  function toggleFavorite() {
    if (!recipe) return
    const exists = state.favorites.find((f) => f.id === recipe.id)
    if (exists) {
      setState((s) => ({ ...s, favorites: s.favorites.filter((f) => f.id !== recipe.id) }))
    } else {
      setState((s) => ({ ...s, favorites: [{ ...recipe }, ...s.favorites].slice(0, 100) }))
      toast({ description: "✅ Receita salva nos Favoritos do V0." })
    }
  }

  function isFavorited() {
    if (!recipe) return false
    return state.favorites.some((f) => f.id === recipe.id)
  }

  function exportPrint() {
    const previous = format
    setFormat("impressao")
    setTimeout(() => {
      window.print()
      setFormat(previous)
    }, 50)
  }

  return (
    <main className="min-h-[100dvh] bg-white text-neutral-900 antialiased dark:bg-black dark:text-neutral-100">
      <div className="mx-auto max-w-5xl px-4 pb-32 pt-8 md:pt-12">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">V0 Chef</h1>
            <p className="text-sm text-muted-foreground">
              Um chef digital minimalista e inteligente. Insira ingredientes e recebe uma receita precisa.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="rounded-full">
              {plan === "pro" ? "Pro" : "Freemium"}
            </Badge>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Configurações">
                  <Settings className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <SheetHeader>
                  <SheetTitle>Configurações</SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Plano</span>
                    <Badge variant="secondary">{plan === "pro" ? "Pro" : "Freemium"}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Apenas administradores podem alterar o plano em /admin/pro.
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Créditos</span>
                    <Badge variant="secondary">{state.credits}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Prompts usados (mês)</span>
                    <Badge variant="secondary">
                      {state.promptsUsed}/{state.freeLimit}
                    </Badge>
                  </div>
                  <Separator />
                  <p className="text-xs text-muted-foreground">
                    Freemium: 25 prompts/mês. Pro: uso ilimitado. Créditos são gerenciados pelo administrador.
                  </p>
                </div>
              </SheetContent>
            </Sheet>
            {isAdmin && (
              <Button asChild variant="outline">
                <Link href="/admin/pro" aria-label="Área administrativa">
                  <ShieldCheck className="mr-2 size-4" />
                  Admin
                </Link>
              </Button>
            )}
            <AuthButton />
          </div>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Novo pedido</CardTitle>
              <CardDescription>Defina os parâmetros da sua receita.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="ingredients">Ingredientes (1 por linha)</Label>
                <Textarea
                  id="ingredients"
                  ref={ingredientsRef}
                  placeholder={"2 ovos\n200 g farinha\n1 xícara leite"}
                  value={ingredients}
                  onChange={(e) => setIngredients(e.target.value)}
                  rows={6}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="servings">Porções</Label>
                  <Input
                    type="number"
                    id="servings"
                    min={1}
                    value={servings}
                    onChange={(e) => setServings(Number(e.target.value || 1))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="style">Estilo</Label>
                  <Select value={styleOption || ""} onValueChange={(v) => setStyleOption(v as any)}>
                    <SelectTrigger id="style">
                      <SelectValue placeholder="Opcional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rápido">Rápido</SelectItem>
                      <SelectItem value="saudável">Saudável</SelectItem>
                      <SelectItem value="comfort food">Comfort food</SelectItem>
                      <SelectItem value="gourmet">Gourmet</SelectItem>
                      <SelectItem value="sobras">Sobras</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="restrictions">Restrições (ex.: sem glúten, sem lactose)</Label>
                <Input
                  id="restrictions"
                  placeholder="Opcional"
                  value={restrictions}
                  onChange={(e) => setRestrictions(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="utensils">Utensílios (ex.: airfryer, panelas, liquidificador)</Label>
                <Input
                  id="utensils"
                  placeholder="Opcional"
                  value={utensils}
                  onChange={(e) => setUtensils(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Formato</Label>
                <ToggleGroup
                  type="single"
                  value={format}
                  onValueChange={(v) => setFormat((v as typeof format) || "resumo")}
                  className="justify-start"
                >
                  <ToggleGroupItem value="resumo" aria-label="Resumo">
                    Resumo
                  </ToggleGroupItem>
                  <ToggleGroupItem value="detalhado" aria-label="Detalhado">
                    Passo‑a‑passo
                  </ToggleGroupItem>
                  <ToggleGroupItem value="impressao" aria-label="Impressão">
                    Impressão
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            </CardContent>
            <CardFooter className="flex items-center gap-2">
              <Button onClick={onGenerate} disabled={loading || !canGenerate}>
                {loading ? "Gerando..." : "Gerar receita"}
              </Button>
              <Button variant="ghost" onClick={handleNew}>
                <RefreshCw className="mr-2 size-4" />
                Nova Receita
              </Button>
              {plan === "freemium" && (
                <span className="ml-auto text-xs text-muted-foreground">Plano freemium: até 25 prompts/mês.</span>
              )}
            </CardFooter>
          </Card>

          <Card className={cn("relative", recipe ? "" : "opacity-70")}>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>{recipe ? recipe.title : "Sua receita aparecerá aqui"}</CardTitle>
                  <CardDescription>
                    {recipe
                      ? "Gerada sob medida com base nos seus ingredientes."
                      : "Aguarde a geração para visualizar detalhes."}
                  </CardDescription>
                </div>
                {recipe && (
                  <img
                    src={
                      recipe.imageUrl ||
                      "/placeholder.svg?height=80&width=120&query=prato%20minimalista%20estilo%20food%20photography" ||
                      "/placeholder.svg" ||
                      "/placeholder.svg" ||
                      "/placeholder.svg"
                    }
                    alt="Foto ilustrativa do prato"
                    className="h-20 w-28 rounded-md object-cover ring-1 ring-black/5"
                  />
                )}
              </div>
              {recipe && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="inline-flex items-center gap-1">
                    <Users className="size-3" />
                    {recipe.servings} porções
                  </Badge>
                  <Badge variant="secondary" className="inline-flex items-center gap-1">
                    <Timer className="size-3" />
                    {recipe.timeMinutes} min
                  </Badge>
                  <Badge variant="outline">{recipe.difficulty}</Badge>
                  {recipe.tags.slice(0, 3).map((t) => (
                    <Badge key={t} variant="outline">
                      {t}
                    </Badge>
                  ))}
                </div>
              )}
            </CardHeader>
            <CardContent id="print-area" className={cn("space-y-4", format === "impressao" ? "text-sm" : "")}>
              {!recipe ? (
                <div className="rounded-md border p-6 text-sm text-muted-foreground">
                  Dica: descreva ingredientes com quantidades para mais precisão (ex.: 200 g de frango, 1 xícara de
                  arroz).
                </div>
              ) : (
                <>
                  <section aria-labelledby="sec-ingredientes" className="space-y-2">
                    <h3 id="sec-ingredientes" className="text-base font-semibold">
                      Ingredientes
                    </h3>
                    <ul className="grid list-disc gap-1 pl-5 [li]::marker:text-neutral-400">
                      {recipe.ingredients.map((ing, i) => (
                        <li key={i}>
                          {ing.quantity} {ing.unit} {ing.name}
                        </li>
                      ))}
                    </ul>
                  </section>

                  <section aria-labelledby="sec-modo" className="space-y-2">
                    <h3 id="sec-modo" className="text-base font-semibold">
                      Modo de preparo
                    </h3>
                    <ol className="grid list-decimal gap-1 pl-5 [li]::marker:text-neutral-400">
                      {recipe.steps.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ol>
                  </section>

                  <section aria-labelledby="sec-tempo" className="space-y-1">
                    <h3 id="sec-tempo" className="text-base font-semibold">
                      Tempo e dificuldade
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Tempo estimado: {recipe.timeMinutes} minutos · Dificuldade: {recipe.difficulty}
                    </p>
                  </section>

                  <Tabs defaultValue="subs" className="w-full">
                    <TabsList>
                      <TabsTrigger value="subs">Substitutos</TabsTrigger>
                      <TabsTrigger value="vari">Variações</TabsTrigger>
                    </TabsList>
                    <TabsContent value="subs" className="mt-2">
                      <ul className="list-disc pl-5 text-sm">
                        {recipe.substitutions.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </TabsContent>
                    <TabsContent value="vari" className="mt-2">
                      <ul className="list-disc pl-5 text-sm">
                        {recipe.variations.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </TabsContent>
                  </Tabs>
                </>
              )}
            </CardContent>
            <CardFooter className="flex items-center gap-2">
              <Button variant="outline" disabled={!recipe} onClick={toggleFavorite}>
                {isFavorited() ? (
                  <Star className="mr-2 size-4 fill-yellow-400 text-yellow-500" />
                ) : (
                  <Heart className="mr-2 size-4" />
                )}
                {isFavorited() ? "Favoritado" : "Favoritar"}
              </Button>
              <Button variant="outline" disabled={!recipe} onClick={exportPrint}>
                <Download className="mr-2 size-4" />
                Exportar
              </Button>
              <div className="ml-auto text-xs text-muted-foreground">
                {plan === "freemium" ? "Imagem gerada por IA disponível no Pro." : "Imagem ilustrativa gerada por IA."}
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Ilha Dinâmica Inferior ajustada */}
      <div
        aria-live="polite"
        className="fixed left-4 right-4 bottom-4 z-50 mx-auto w-auto max-w-3xl rounded-2xl border bg-white/90 p-2 md:p-3 shadow-lg backdrop-blur dark:bg-neutral-950/90 overflow-hidden"
      >
        <div className="flex flex-wrap items-center gap-2 md:gap-3 md:justify-between">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 order-2 md:order-1">
                <Bookmark className="size-4" />
                Favoritos
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[65vh]">
              <SheetHeader>
                <SheetTitle>Favoritos</SheetTitle>
              </SheetHeader>
              <div className="mt-4 grid grid-cols-1 gap-3 overflow-auto pb-6 md:grid-cols-2">
                {state.favorites.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhuma receita favoritada ainda.</p>
                )}
                {state.favorites.map((fav) => (
                  <Card key={fav.id} role="button" className="group transition hover:shadow-sm">
                    <CardHeader className="space-y-1">
                      <CardTitle className="line-clamp-1 text-base">{fav.title}</CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <Badge variant="secondary" className="inline-flex items-center gap-1">
                          <Users className="size-3" />
                          {fav.servings}
                        </Badge>
                        <Badge variant="secondary" className="inline-flex items-center gap-1">
                          <Timer className="size-3" />
                          {fav.timeMinutes} min
                        </Badge>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <img
                        src={
                          fav.imageUrl ||
                          "/placeholder.svg?height=120&width=240&query=foto%20de%20prato%20minimalista" ||
                          "/placeholder.svg" ||
                          "/placeholder.svg" ||
                          "/placeholder.svg"
                        }
                        alt={"Foto da receita " + fav.title}
                        className="h-28 w-full rounded-md object-cover"
                      />
                    </CardContent>
                    <CardFooter className="flex items-center justify-between">
                      <div className="flex gap-1">
                        {fav.tags.slice(0, 2).map((t) => (
                          <Badge key={t} variant="outline">
                            {t}
                          </Badge>
                        ))}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setRecipe(fav)
                          toast({ description: "Receita carregada." })
                        }}
                      >
                        Abrir
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </SheetContent>
          </Sheet>

          <Button
            size="lg"
            className="rounded-full px-6 shadow-sm order-1 md:order-2 mx-auto shrink-0"
            onClick={() => {
              handleNew()
              toast({ description: "Pronto para uma nova receita." })
            }}
          >
            🍽️ Nova Receita
          </Button>

          <div className="order-3 md:order-3 ml-auto flex items-center gap-2">
            <Badge variant="secondary" className="rounded-full leading-none py-1.5">
              {plan === "freemium"
                ? `Restam ${remaining === Number.POSITIVE_INFINITY ? 0 : remaining} / ${state.freeLimit}`
                : "Pro"}
            </Badge>
            {plan !== "pro" && (
              <Badge variant="outline" className="rounded-full leading-none py-1.5">
                Créditos: {state.credits}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
