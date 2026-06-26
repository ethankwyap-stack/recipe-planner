import type { MealType, Recipe, WeekPlan } from '../types'
import { DAY_NAMES } from '../lib/week'

function SlotCell({
  recipe,
  label,
  onPick,
  onClear,
  onReroll,
  readOnly,
}: {
  recipe: Recipe | undefined
  label: MealType
  onPick?: () => void
  onClear?: () => void
  onReroll?: () => void
  readOnly?: boolean
}) {
  return (
    <div className="rounded-lg border border-border bg-surface-2 p-2">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
        {label}
      </div>
      {recipe ? (
        <div className="group">
          <button
            onClick={onPick}
            className="block w-full text-left text-sm font-medium leading-snug hover:text-neon"
            title="Change / view"
          >
            {recipe.title}
          </button>
          {!readOnly && (
            <div className="mt-1 flex gap-2 opacity-0 transition group-hover:opacity-100 no-print">
              <button onClick={onReroll} className="text-xs text-muted hover:text-neon">
                ↻ reroll
              </button>
              <button onClick={onClear} className="text-xs text-muted hover:text-red-300">
                clear
              </button>
            </div>
          )}
        </div>
      ) : readOnly ? (
        <div className="py-2 text-xs text-muted/60">—</div>
      ) : (
        <button
          onClick={onPick}
          className="w-full rounded border border-dashed border-border py-2 text-xs text-muted hover:border-neon/50 hover:text-neon no-print"
        >
          + add
        </button>
      )}
    </div>
  )
}

export function WeekGrid({
  week,
  recipes,
  onPick,
  onClear,
  onReroll,
  readOnly,
}: {
  week: WeekPlan
  recipes: Recipe[]
  onPick?: (dayIndex: number, meal: MealType) => void
  onClear?: (dayIndex: number, meal: MealType) => void
  onReroll?: (dayIndex: number, meal: MealType) => void
  readOnly?: boolean
}) {
  const byId = new Map(recipes.map((r) => [r.id, r]))
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
      {week.days.map((day, i) => {
        const d = new Date(day.date + 'T00:00:00')
        return (
          <div key={day.date} className="flex flex-col gap-2">
            <div className="text-center">
              <div className="text-sm font-semibold">{DAY_NAMES[i]}</div>
              <div className="text-[11px] text-muted">{d.getDate()}</div>
            </div>
            <SlotCell
              label="lunch"
              recipe={day.lunchRecipeId ? byId.get(day.lunchRecipeId) : undefined}
              onPick={() => onPick?.(i, 'lunch')}
              onClear={() => onClear?.(i, 'lunch')}
              onReroll={() => onReroll?.(i, 'lunch')}
              readOnly={readOnly}
            />
            <SlotCell
              label="dinner"
              recipe={day.dinnerRecipeId ? byId.get(day.dinnerRecipeId) : undefined}
              onPick={() => onPick?.(i, 'dinner')}
              onClear={() => onClear?.(i, 'dinner')}
              onReroll={() => onReroll?.(i, 'dinner')}
              readOnly={readOnly}
            />
          </div>
        )
      })}
    </div>
  )
}
