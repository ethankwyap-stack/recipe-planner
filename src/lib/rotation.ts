import type { MealType, Recipe, WeekPlan } from '../types'
import { emptyWeek } from './week'

export interface RotationOptions {
  /** Only use recipes carrying ALL of these tags (e.g. ["vegetarian"]). Empty = no filter. */
  requiredTags?: string[]
  /** Recipe ids used in recent weeks, de-prioritised so the menu stays fresh. */
  recentlyUsedIds?: string[]
  /** Favourite recipe ids, biased toward the front so the week leans on what you love. */
  favoriteIds?: string[]
  /** Keep any slots the user already filled instead of overwriting them. */
  keepExisting?: boolean
}

function eligible(recipes: Recipe[], meal: MealType, requiredTags: string[]): Recipe[] {
  return recipes.filter(
    (r) =>
      r.meal.includes(meal) &&
      requiredTags.every((t) => r.tags.map((x) => x.toLowerCase()).includes(t.toLowerCase())),
  )
}

/** Shuffle with a light bias: favourites float up, recently-used recipes sink. */
function orderForWeek(pool: Recipe[], recentlyUsed: Set<string>, favorites: Set<string>): Recipe[] {
  return [...pool]
    .map((r) => ({
      r,
      key: Math.random() + (recentlyUsed.has(r.id) ? 1.5 : 0) - (favorites.has(r.id) ? 0.75 : 0),
    }))
    .sort((a, b) => a.key - b.key)
    .map((x) => x.r)
}

/**
 * Fill a week's lunch + dinner slots from the library.
 * - Never repeats a recipe within the same week (until the pool is exhausted).
 * - Respects required tag filters.
 * - De-prioritises recipes used in recent weeks.
 */
export function autoFillWeek(
  base: WeekPlan,
  recipes: Recipe[],
  opts: RotationOptions = {},
): WeekPlan {
  const requiredTags = opts.requiredTags ?? []
  const recent = new Set(opts.recentlyUsedIds ?? [])
  const favorites = new Set(opts.favoriteIds ?? [])
  const week: WeekPlan = { ...base, days: base.days.map((d) => ({ ...d })) }

  for (const meal of ['lunch', 'dinner'] as MealType[]) {
    const pool = orderForWeek(eligible(recipes, meal, requiredTags), recent, favorites)
    if (pool.length === 0) continue
    const usedThisWeek = new Set<string>()
    let cursor = 0
    const next = (): string => {
      // Advance past recipes already used this week; wrap if pool exhausted.
      for (let i = 0; i < pool.length; i++) {
        const candidate = pool[(cursor + i) % pool.length]
        if (!usedThisWeek.has(candidate.id)) {
          cursor = (cursor + i + 1) % pool.length
          usedThisWeek.add(candidate.id)
          return candidate.id
        }
      }
      // Pool smaller than 7 days — allow repeats, just rotate.
      const fallback = pool[cursor % pool.length]
      cursor++
      return fallback.id
    }

    for (const day of week.days) {
      const slot = meal === 'lunch' ? 'lunchRecipeId' : 'dinnerRecipeId'
      if (opts.keepExisting && day[slot]) {
        usedThisWeek.add(day[slot]!)
        continue
      }
      day[slot] = next()
    }
  }

  return week
}

/** Pick a single replacement recipe for one slot, avoiding everything already in the week. */
export function rerollSlot(
  week: WeekPlan,
  recipes: Recipe[],
  meal: MealType,
  requiredTags: string[] = [],
): string | null {
  const inWeek = new Set<string>()
  week.days.forEach((d) => {
    if (d.lunchRecipeId) inWeek.add(d.lunchRecipeId)
    if (d.dinnerRecipeId) inWeek.add(d.dinnerRecipeId)
  })
  const pool = eligible(recipes, meal, requiredTags)
  const fresh = pool.filter((r) => !inWeek.has(r.id))
  const choices = fresh.length > 0 ? fresh : pool
  if (choices.length === 0) return null
  return choices[Math.floor(Math.random() * choices.length)].id
}

/** Convenience: a fresh empty week auto-filled. */
export function generateWeek(
  recipes: Recipe[],
  weekStartDate: string,
  householdServings: number,
  opts: RotationOptions = {},
): WeekPlan {
  return autoFillWeek(emptyWeek(weekStartDate, householdServings), recipes, opts)
}
