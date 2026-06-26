import type { SharedPlan } from '../types'
import { WeekGrid } from '../components/WeekGrid'
import { GroceryList } from '../components/GroceryList'
import { RecipeCard } from '../components/RecipeCard'
import { RecipeDetail } from '../components/RecipeDetail'
import { Button, Modal } from '../components/ui'
import { weekRangeLabel } from '../lib/week'
import { useState } from 'react'

export function SharedPlanView({
  shared,
  onSaveCopy,
  onExit,
}: {
  shared: SharedPlan
  onSaveCopy: () => void
  onExit: () => void
}) {
  const [viewing, setViewing] = useState<string | null>(null)
  const recipe = shared.recipes.find((r) => r.id === viewing)

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-neon/30 bg-neon/5 p-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-neon">Shared meal plan</p>
          <h1 className="text-xl font-bold">
            {shared.title || 'Weekly plan'}{' '}
            <span className="text-sm font-normal text-muted">· {weekRangeLabel(shared.plan)}</span>
          </h1>
        </div>
        <div className="ml-auto flex gap-2 no-print">
          <Button variant="ghost" onClick={onExit}>
            Open my planner
          </Button>
          <Button variant="primary" onClick={onSaveCopy}>
            ＋ Save a copy
          </Button>
        </div>
      </div>

      <WeekGrid week={shared.plan} recipes={shared.recipes} readOnly />

      <div className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">🛒 Grocery list</h2>
        <GroceryList week={shared.plan} recipes={shared.recipes} />
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">📖 Recipes in this plan</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shared.recipes.map((r) => (
            <RecipeCard key={r.id} recipe={r} onClick={() => setViewing(r.id)} />
          ))}
        </div>
      </div>

      <Modal open={!!recipe} onClose={() => setViewing(null)} title={recipe?.title ?? ''} wide>
        {recipe && <RecipeDetail recipe={recipe} readOnly />}
      </Modal>
    </div>
  )
}
