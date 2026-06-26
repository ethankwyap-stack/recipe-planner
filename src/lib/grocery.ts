import type { Aisle, Recipe, WeekPlan } from '../types'
import { AISLES } from '../types'

export interface GroceryLine {
  item: string
  unit: string
  qty: number // 0 means "to taste" / unmeasured
  aisle: Aisle
  /** Which recipe titles contribute to this line (for the tooltip/print). */
  fromRecipes: string[]
}

export interface GrocerySection {
  aisle: Aisle
  lines: GroceryLine[]
}

const keyOf = (item: string, unit: string) => `${item.trim().toLowerCase()}|${unit.trim().toLowerCase()}`

/**
 * Build a consolidated grocery list for a week.
 * - Scales each recipe's ingredients to the household serving count.
 * - Merges identical item+unit pairs and sums quantities.
 * - Groups by aisle in a sensible shopping order.
 */
export function buildGroceryList(week: WeekPlan, recipes: Recipe[]): GrocerySection[] {
  const byId = new Map(recipes.map((r) => [r.id, r]))
  const lines = new Map<string, GroceryLine>()

  const addRecipe = (recipeId: string | null) => {
    if (!recipeId) return
    const r = byId.get(recipeId)
    if (!r) return
    const scale = r.servings > 0 ? week.householdServings / r.servings : 1
    for (const ing of r.ingredients) {
      const k = keyOf(ing.item, ing.unit)
      const existing = lines.get(k)
      const scaledQty = ing.qty * scale
      if (existing) {
        existing.qty += scaledQty
        if (!existing.fromRecipes.includes(r.title)) existing.fromRecipes.push(r.title)
      } else {
        lines.set(k, {
          item: ing.item,
          unit: ing.unit,
          qty: scaledQty,
          aisle: ing.aisle,
          fromRecipes: [r.title],
        })
      }
    }
  }

  for (const day of week.days) {
    addRecipe(day.lunchRecipeId)
    addRecipe(day.dinnerRecipeId)
  }

  const sections: GrocerySection[] = AISLES.map((aisle) => ({
    aisle,
    lines: [...lines.values()]
      .filter((l) => l.aisle === aisle)
      .sort((a, b) => a.item.localeCompare(b.item)),
  })).filter((s) => s.lines.length > 0)

  return sections
}

export function totalItems(sections: GrocerySection[]): number {
  return sections.reduce((n, s) => n + s.lines.length, 0)
}
