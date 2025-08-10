export type RecipeInput = {
  ingredients: string
  servings: number
  restrictions?: string
  utensils?: string
  style?: "rápido" | "saudável" | "comfort food" | "gourmet" | "sobras"
  format?: "resumo" | "detalhado" | "impressao"
  pro?: boolean
}

export type Ingredient = {
  name: string
  quantity: number
  unit: "g" | "ml" | "unid" | "colher" | "xícara"
}

export type Recipe = {
  id: string
  title: string
  servings: number
  ingredients: Ingredient[]
  steps: string[]
  timeMinutes: number
  difficulty: "Fácil" | "Média" | "Difícil"
  substitutions: string[]
  variations: string[]
  tags: string[]
  imageUrl: string
}

const LIQUIDS = ["água", "leite", "óleo", "caldo", "vinho", "molho", "suco", "creme", "azeite", "coco", "shoyu"]
const EGGS = ["ovo", "ovos"]
const CUPS_WORDS = ["xícara", "xicara", "xicaras", "xícaras", "cup", "copo", "copos"]

function toSlug(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

function isLiquid(name: string) {
  const n = name.toLowerCase()
  return LIQUIDS.some((w) => n.includes(w))
}

function parseLine(line: string): Ingredient | null {
  const raw = line.trim().replace(",", ".")
  if (!raw) return null

  // capture quantity and unit if present
  const numMatch = raw.match(/(\d+([.,]\d+)?)/)
  const qty = numMatch ? Number.parseFloat(numMatch[1]) : 1

  const hasCup = CUPS_WORDS.some((w) => raw.toLowerCase().includes(w))
  const hasEgg = EGGS.some((w) => raw.toLowerCase().includes(w))
  const name = raw
    .replace(/\d+([.,]\d+)?/g, "")
    .replace(/\b(g|gramas?|ml|mililitros?|xíc(ar)?as?|colheres?|colher(es)?|un(id)?|copos?|cups?)\b/gi, "")
    .trim()

  if (hasEgg) {
    return { name: name || "ovo", quantity: Math.max(1, Math.round(qty)), unit: "unid" }
  }

  if (hasCup) {
    // Normalize cup to ml (~240 ml) for liquids, or g (~120 g) for dry
    if (isLiquid(name)) {
      return { name: name || "líquido", quantity: Math.round(qty * 240), unit: "ml" }
    } else {
      return { name: name || "ingrediente", quantity: Math.round(qty * 120), unit: "g" }
    }
  }

  if (raw.toLowerCase().includes("colher")) {
    // 1 colher ~ 15 ml (líquido) ou 10 g (seco)
    if (isLiquid(name)) {
      return { name: name || "líquido", quantity: Math.round(qty * 15), unit: "ml" }
    } else {
      return { name: name || "ingrediente", quantity: Math.round(qty * 10), unit: "g" }
    }
  }

  // Direct g / ml
  if (raw.toLowerCase().includes(" ml")) {
    return { name: name || "líquido", quantity: Math.round(qty), unit: "ml" }
  }
  if (raw.toLowerCase().includes(" g")) {
    return { name: name || "ingrediente", quantity: Math.round(qty), unit: "g" }
  }

  // Heuristic default
  if (isLiquid(name)) {
    return { name: name || "líquido", quantity: Math.round(qty * 100), unit: "ml" }
  }

  return { name: name || "ingrediente", quantity: Math.round(qty * 100), unit: "g" }
}

function scaleIngredients(ings: Ingredient[], factor: number) {
  return ings.map((i) => ({
    ...i,
    quantity:
      i.unit === "unid" ? Math.max(1, Math.round(i.quantity * factor)) : Math.max(1, Math.round(i.quantity * factor)),
  }))
}

function pickDifficulty(time: number, steps: number): Recipe["difficulty"] {
  if (time <= 20 && steps <= 5) return "Fácil"
  if (time <= 40 && steps <= 9) return "Média"
  return "Difícil"
}

function estimateTime(ings: Ingredient[], style?: RecipeInput["style"]) {
  let base = 10 + Math.min(ings.length * 4, 30)
  if (style === "rápido") base -= 8
  if (style === "gourmet") base += 15
  if (style === "saudável") base += 0
  if (style === "sobras") base -= 4
  if (style === "comfort food") base += 5
  return Math.max(10, Math.round(base))
}

function buildTitle(ings: Ingredient[], style?: RecipeInput["style"]) {
  const key = ings[0]?.name || "Receita"
  const main = key.charAt(0).toUpperCase() + key.slice(1)
  const styleTag = style ? ` ${style}` : ""
  return `${main}${styleTag}`.replace(/\s+/g, " ").trim()
}

function buildSteps(
  ings: Ingredient[],
  style?: RecipeInput["style"],
  format?: RecipeInput["format"],
  utensils?: string,
): string[] {
  const hasLiquid = ings.some((i) => i.unit === "ml")
  const hasEggs = ings.some((i) => i.unit === "unid" && /ovo/.test(i.name.toLowerCase()))
  const hasFlour = ings.some((i) => /farinha|trigo/.test(i.name.toLowerCase()))

  const concise = format !== "detalhado"

  const pre: string[] = []
  if (utensils?.toLowerCase().includes("airfryer")) {
    pre.push("Preaqueça a airfryer a 180°C por 5 minutos.")
  } else if (utensils?.toLowerCase().includes("forno")) {
    pre.push("Preaqueça o forno a 200°C.")
  } else {
    pre.push("Separe os utensílios e higienize os ingredientes.")
  }

  const mix: string[] = []
  if (hasFlour && hasLiquid) {
    mix.push("Em uma tigela, misture os secos. Em outra, os líquidos.")
    mix.push("Incorpore os líquidos aos secos aos poucos, mexendo até ficar homogêneo.")
  } else {
    mix.push("Corte e organize os ingredientes conforme necessário.")
    mix.push("Aqueça uma panela média e adicione gordura (óleo/azeite).")
  }

  const proteinStep = ings.some((i) => /frango|carne|peixe|tofu|feijão/i.test(i.name))
  const cook: string[] = []
  if (proteinStep) {
    cook.push("Doure a proteína por 3–5 minutos, tempere com sal e pimenta.")
  }
  if (hasEggs) {
    cook.push("Adicione os ovos e mexa até atingir o ponto desejado.")
  }
  cook.push("Cozinhe por mais alguns minutos, ajustando sal e acidez a gosto.")

  const finish: string[] = []
  if (style === "gourmet") {
    finish.push("Finalize com um fio de azeite e ervas frescas.")
    finish.push("Emprate com cuidado e sirva imediatamente.")
  } else if (style === "saudável") {
    finish.push("Finalize com sementes ou folhas verdes para frescor.")
  } else if (style === "sobras") {
    finish.push("Aproveite sobras para adicionar textura (croutons, legumes assados).")
  } else {
    finish.push("Sirva quente.")
  }

  const stepsFull = [...pre, ...mix, ...cook, ...finish]
  if (concise) {
    return stepsFull.slice(0, Math.min(6, stepsFull.length))
  }
  return stepsFull
}

function buildSubs(ings: Ingredient[], restrictions?: string): string[] {
  const subs: string[] = []
  const restr = (restrictions || "").toLowerCase()
  for (const i of ings) {
    const n = i.name.toLowerCase()
    if (/leite/.test(n) && restr.includes("sem lactose")) subs.push("Leite por bebida vegetal (aveia, amêndoas).")
    if (/farinha/.test(n) && restr.includes("sem glúten"))
      subs.push("Farinha de trigo por farinha de arroz/aveia (sem glúten).")
    if (/manteiga|queijo/.test(n) && restr.includes("vegano")) subs.push("Laticínios por alternativas vegetais.")
    if (/frango|carne|peixe/.test(n) && (restr.includes("vegano") || restr.includes("vegetar")))
      subs.push("Proteína animal por grão-de-bico/tofu.")
    if (/açucar|açúcar|acucar/.test(n) && restr.includes("sem açúcar")) subs.push("Açúcar por eritritol ou xilitol.")
  }
  if (subs.length === 0) {
    subs.push("Ajuste sal e acidez com limão ou vinagre conforme o paladar.")
  }
  return Array.from(new Set(subs))
}

function buildVariations(style?: RecipeInput["style"]): string[] {
  const base = [
    "Adicione ervas frescas (salsinha, cebolinha, coentro) no final.",
    "Inclua um toque cítrico (raspas de limão) para realçar sabores.",
  ]
  if (style === "rápido") base.push("Use airfryer ou panela única para reduzir tempo e louça.")
  if (style === "gourmet") base.push("Finalize com manteiga noisette ou redução balsâmica.")
  if (style === "saudável") base.push("Troque carboidratos refinados por integrais.")
  if (style === "sobras") base.push("Transforme em recheio de sanduíche ou tortilha no dia seguinte.")
  if (style === "comfort food") base.push("Engrosse o molho com um roux leve para textura cremosa.")
  return base
}

function buildTags(ings: Ingredient[], style?: RecipeInput["style"], restrictions?: string): string[] {
  const tags = new Set<string>()
  if (style) tags.add(style)
  if (restrictions) {
    for (const r of restrictions
      .split(/[;,]/)
      .map((s) => s.trim())
      .filter(Boolean)) {
      tags.add(r)
    }
  }
  if (ings.some((i) => /frango|carne|peixe/i.test(i.name))) tags.add("proteína")
  if (ings.some((i) => /arroz|massa|macarrão|batata|pão/i.test(i.name))) tags.add("carboidrato")
  if (ings.some((i) => /legume|verdura|tomate|cenoura|abobrinha|brocolis|brócolis/i.test(i.name))) tags.add("vegetais")
  return Array.from(tags)
}

export async function generateRecipe(input: RecipeInput): Promise<Recipe> {
  // Parse ingredients
  const lines = input.ingredients
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  const parsed = lines.map(parseLine).filter(Boolean) as Ingredient[]

  // Scale by servings; assume user quantities refer to 2 porções base, scale factor = servings / 2
  const baseServings = 2
  const factor = Math.max(0.25, input.servings / baseServings)
  const scaled = scaleIngredients(parsed, factor)

  const time = estimateTime(scaled, input.style)
  const steps = buildSteps(scaled, input.style, input.format, input.utensils)
  const difficulty = pickDifficulty(time, steps.length)
  const title = buildTitle(scaled, input.style)
  const substitutions = buildSubs(scaled, input.restrictions)
  const variations = buildVariations(input.style)
  const tags = buildTags(scaled, input.style, input.restrictions)

  const id = `${toSlug(title)}-${Date.now()}`
  const imageUrl = input.pro ? "/gourmet-food-photography.png" : ""

  // If "impressao", we still return full data; rendering decides compactness
  const recipe: Recipe = {
    id,
    title,
    servings: input.servings,
    ingredients: scaled,
    steps,
    timeMinutes: time,
    difficulty,
    substitutions,
    variations,
    tags,
    imageUrl,
  }

  // Simulate latency for UX micro-animation
  await new Promise((r) => setTimeout(r, 500))
  return recipe
}
