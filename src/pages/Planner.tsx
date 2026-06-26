import { useMemo, useState } from 'react'
import type { MealType, Recipe, WeekPlan } from '../types'
import { WeekGrid } from '../components/WeekGrid'
import { GroceryList } from '../components/GroceryList'
import { RecipePicker } from '../components/RecipePicker'
import { Badge, Button } from '../components/ui'
import { autoFillWeek, rerollSlot } from '../lib/rotation'
import { addWeeks, emptyWeek, weekRangeLabel } from '../lib/week'
import { loadRecentIds, pushRecentIds } from '../lib/storage'

const slotKey = (meal: MealType) => (meal === 'lunch' ? 'lunchRecipeId' : 'dinnerRecipeId')

export function Planner({
  week,
  setWeek,
  recipes,
  favorites,
  onShare,
}: {
  week: WeekPlan
  setWeek: (w: WeekPlan) => void
  recipes: Recipe[]
  favorites: Set<string>
  onShare: () => void
}) {
  const [requiredTags, setRequiredTags] = useState<string[]>([])
  const [picking, setPicking] = useState<{ day: number; meal: MealType } | null>(null)

  const allTags = useMemo(() => {
    const set = new Set<string>()
    recipes.forEach((r) => r.tags.forEach((t) => set.add(t)))
    return [...set].sort()
  }, [recipes])

  const toggleTag = (t: string) =>
    setRequiredTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]))

  const autoFill = (keepExisting: boolean) => {
    const filled = autoFillWeek(week, recipes, {
      requiredTags,
      recentlyUsedIds: loadRecentIds(),
      favoriteIds: [...favorites],
      keepExisting,
    })
    setWeek(filled)
    const ids = filled.days.flatMap((d) => [d.lunchRecipeId, d.dinnerRecipeId]).filter(Boolean) as string[]
    pushRecentIds(ids)
  }

  const setSlot = (day: number, meal: MealType, id: string | null) => {
    const next: WeekPlan = { ...week, days: week.days.map((d) => ({ ...d })) }
    next.days[day][slotKey(meal)] = id
    setWeek(next)
  }

  const reroll = (day: number, meal: MealType) => {
    const id = rerollSlot(week, recipes, meal, requiredTags)
    if (id) setSlot(day, meal, id)
  }

  const clearAll = () => setWeek(emptyWeek(week.weekStartDate, week.householdServings))

  return (
    <div>
      {/* Week + serving controls */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Button variant="ghost" onClick={() => setWeek({ ...week, ...shiftWeek(week, -1) })}>
            ←
          </Button>
          <span className="min-w-[140px] text-center text-sm font-medium">
            {weekRangeLabel(week)}
          </span>
          <Button variant="ghost" onClick={() => setWeek({ ...week, ...shiftWeek(week, 1) })}>
            →
          </Button>
        </div>

        <label className="flex items-center gap-2 text-sm text-muted">
          Cooking for
          <input
            type="number"
            min={1}
            max={20}
            value={week.householdServings}
            onChange={(e) =>
              setWeek({ ...week, householdServings: Math.max(1, Number(e.target.value)) })
            }
            className="w-16 rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-text"
          />
          {week.householdServings === 1 ? 'person' : 'people'}
        </label>

        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="ghost" onClick={clearAll}>
            Clear
          </Button>
          <Button variant="subtle" onClick={() => autoFill(true)}>
            Fill empty slots
          </Button>
          <Button variant="primary" onClick={() => autoFill(false)}>
            ✨ Auto-fill week
          </Button>
          <Button variant="ghost" onClick={onShare}>
            🔗 Share
          </Button>
        </div>
      </div>

      {/* Diet filter for auto-fill */}
      {allTags.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs uppercase tracking-wide text-muted">Auto-fill only:</span>
          {allTags.map((t) => (
            <Badge key={t} active={requiredTags.includes(t)} onClick={() => toggleTag(t)}>
              {t}
            </Badge>
          ))}
          {requiredTags.length > 0 && (
            <button
              className="text-xs text-muted hover:text-neon"
              onClick={() => setRequiredTags([])}
            >
              reset
            </button>
          )}
        </div>
      )}

      <WeekGrid
        week={week}
        recipes={recipes}
        onPick={(day, meal) => setPicking({ day, meal })}
        onClear={(day, meal) => setSlot(day, meal, null)}
        onReroll={reroll}
      />

      <div className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">🛒 Grocery list</h2>
        <GroceryList week={week} recipes={recipes} />
      </div>

      <RecipePicker
        open={!!picking}
        onClose={() => setPicking(null)}
        recipes={recipes}
        meal={picking?.meal ?? null}
        onSelect={(id) => picking && setSlot(picking.day, picking.meal, id)}
      />
    </div>
  )
}

// Move the whole plan to the previous/next week, preserving chosen recipes by weekday.
function shiftWeek(week: WeekPlan, n: number): Pick<WeekPlan, 'weekStartDate' | 'days'> {
  const newStart = addWeeks(week.weekStartDate, n)
  const base = emptyWeek(newStart, week.householdServings)
  base.days = base.days.map((d, i) => ({
    ...d,
    lunchRecipeId: week.days[i].lunchRecipeId,
    dinnerRecipeId: week.days[i].dinnerRecipeId,
  }))
  return { weekStartDate: newStart, days: base.days }
}
