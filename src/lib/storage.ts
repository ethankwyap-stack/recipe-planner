import type { Recipe } from '../types'

const DRAFT_KEY = 'mise.recipeDraft'
const PLAN_KEY = 'mise.weekPlan'
const RECENT_KEY = 'mise.recentRecipeIds'

/** Fetch the canonical recipe collection baked into the site. */
export async function fetchRecipes(): Promise<Recipe[]> {
  const url = `${import.meta.env.BASE_URL}data/recipes.json`
  const res = await fetch(url, { cache: 'no-cache' })
  if (!res.ok) throw new Error(`Could not load recipes.json (${res.status})`)
  return (await res.json()) as Recipe[]
}

/**
 * Load recipes for the session: prefer an uncommitted local draft (so edits the
 * owner hasn't pushed yet survive a reload), falling back to the site's recipes.json.
 */
export async function loadRecipes(): Promise<{ recipes: Recipe[]; fromDraft: boolean }> {
  const draft = localStorage.getItem(DRAFT_KEY)
  if (draft) {
    try {
      return { recipes: JSON.parse(draft) as Recipe[], fromDraft: true }
    } catch {
      /* fall through to canonical */
    }
  }
  return { recipes: await fetchRecipes(), fromDraft: false }
}

export function saveDraft(recipes: Recipe[]): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(recipes))
  } catch {
    // localStorage can fill up once recipes carry photos. The published recipes.json
    // remains the source of truth, so a failed local draft is non-fatal.
  }
}

/** Drop the local draft once changes are committed to the repo. */
export function clearDraft(): void {
  localStorage.removeItem(DRAFT_KEY)
}

export function hasDraft(): boolean {
  return localStorage.getItem(DRAFT_KEY) !== null
}

// --- Week plan persistence (owner's working plan) ---
export function savePlan(json: unknown): void {
  localStorage.setItem(PLAN_KEY, JSON.stringify(json))
}

export function loadPlan<T>(): T | null {
  const raw = localStorage.getItem(PLAN_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

// --- Recently used recipe ids (keeps the rotation fresh across weeks) ---
export function loadRecentIds(): string[] {
  const raw = localStorage.getItem(RECENT_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw) as string[]
  } catch {
    return []
  }
}

export function pushRecentIds(ids: string[]): void {
  const prev = loadRecentIds()
  // Keep the most recent ~2 weeks worth (28 slots) of history.
  const merged = [...ids, ...prev].slice(0, 28)
  localStorage.setItem(RECENT_KEY, JSON.stringify(merged))
}

/** Download the recipe collection as a file the owner can drop into the repo. */
export function exportRecipesFile(recipes: Recipe[]): void {
  const blob = new Blob([JSON.stringify(recipes, null, 2) + '\n'], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'recipes.json'
  a.click()
  URL.revokeObjectURL(url)
}
