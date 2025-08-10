import type { Recipe } from "./recipe"

export type AppState = {
  plan: "freemium" | "pro" | "creditos"
  freeLimit: number
  promptsUsed: number
  credits: number
  favorites: Recipe[]
}

export const defaultAppState: AppState = {
  plan: "freemium",
  freeLimit: 25,
  promptsUsed: 0,
  credits: 3,
  favorites: [],
}

const STORAGE_PREFIX = "v0-chef"
export function getMonthlyKey() {
  const d = new Date()
  return `${STORAGE_PREFIX}:${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

export function loadAppState(key: string): AppState {
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const parsed = JSON.parse(raw) as AppState
      // Ensure shape
      return {
        plan: parsed.plan ?? defaultAppState.plan,
        freeLimit: parsed.freeLimit ?? 25,
        promptsUsed: parsed.promptsUsed ?? 0,
        credits: parsed.credits ?? 0,
        favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
      }
    } else {
      // clear previous months to avoid clutter
      const keys = Object.keys(localStorage)
      keys.forEach((k) => {
        if (k.startsWith(STORAGE_PREFIX) && k !== key) localStorage.removeItem(k)
      })
      localStorage.setItem(key, JSON.stringify(defaultAppState))
      return defaultAppState
    }
  } catch {
    return defaultAppState
  }
}

export function saveAppState(key: string, state: AppState) {
  try {
    localStorage.setItem(key, JSON.stringify(state))
  } catch {
    // ignore
  }
}
