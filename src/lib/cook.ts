import type { Ingredient, Recipe } from '../types'

export interface CookMatch {
  recipe: Recipe
  /** Non-staple ingredients you already have. */
  have: Ingredient[]
  /** Non-staple ingredients you're missing. */
  missing: Ingredient[]
  /** Fraction of the recipe's "real" ingredients you have (0..1). */
  coverage: number
}

// Pantry staples almost everyone has — not counted as "missing".
const STAPLES = [/\bsalt\b/, /\bpepper\b/, /\boil\b/, /\bwater\b/, /\bbutter\b/]

function isStaple(item: string): boolean {
  const s = item.toLowerCase()
  return STAPLES.some((re) => re.test(s))
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .replace(/\b(fresh|dried|ground|chopped|sliced|diced|baby|large|small)\b/g, '')
    .trim()
}

/** Does an ingredient match anything in the user's pantry list? (loose substring match) */
function haveIt(ingredient: string, pantry: string[]): boolean {
  const a = norm(ingredient)
  if (!a) return false
  return pantry.some((p) => {
    const b = norm(p)
    return b.length > 1 && (a.includes(b) || b.includes(a))
  })
}

/**
 * Rank recipes by how well the user's on-hand ingredients cover them.
 * Staples (salt/pepper/oil/water/butter) and "to taste" items are assumed available.
 * Returns matches sorted by fewest missing, then highest coverage.
 */
export function findCookable(recipes: Recipe[], pantryRaw: string[]): CookMatch[] {
  const pantry = pantryRaw.map((s) => s.trim()).filter(Boolean)
  if (pantry.length === 0) return []

  return recipes
    .map((recipe): CookMatch => {
      const real = recipe.ingredients.filter((i) => !isStaple(i.item))
      const have: Ingredient[] = []
      const missing: Ingredient[] = []
      for (const ing of real) {
        if (haveIt(ing.item, pantry)) have.push(ing)
        else missing.push(ing)
      }
      const coverage = real.length === 0 ? 1 : have.length / real.length
      return { recipe, have, missing, coverage }
    })
    .filter((m) => m.have.length > 0)
    .sort((a, b) => a.missing.length - b.missing.length || b.coverage - a.coverage)
}
