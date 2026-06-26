import type { Recipe } from '../types'
import { Badge } from './ui'
import { FavStar } from './FavStar'

export function RecipeCard({
  recipe,
  onClick,
  isFavorite,
  onToggleFavorite,
}: {
  recipe: Recipe
  onClick?: () => void
  isFavorite?: boolean
  onToggleFavorite?: () => void
}) {
  const time = (recipe.prepTime ?? 0) + (recipe.cookTime ?? 0)
  return (
    <div className="group relative">
      {onToggleFavorite && (
        <div className="absolute right-2.5 top-2.5 z-10">
          <FavStar active={!!isFavorite} onToggle={onToggleFavorite} />
        </div>
      )}
      <button
        onClick={onClick}
        className="flex w-full flex-col rounded-xl border border-border bg-surface p-4 text-left transition hover:-translate-y-0.5 hover:border-neon/50 hover:shadow-[0_8px_30px_-12px_var(--color-neon)]"
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="pr-6 font-semibold leading-snug group-hover:text-neon">{recipe.title}</h3>
          {time > 0 && <span className="shrink-0 text-xs text-muted">⏱ {time}m</span>}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {recipe.meal.map((m) => (
            <Badge key={m} tone="accent">
              {m}
            </Badge>
          ))}
          {recipe.tags.slice(0, 3).map((t) => (
            <Badge key={t}>{t}</Badge>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">
          {recipe.ingredients.length} ingredients · serves {recipe.servings}
        </p>
      </button>
    </div>
  )
}
