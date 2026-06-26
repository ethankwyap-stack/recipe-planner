import type { Recipe } from '../types'
import { qtyLabel } from '../lib/units'
import { Badge, Button } from './ui'
import { FavStar } from './FavStar'

export function RecipeDetail({
  recipe,
  onEdit,
  onDelete,
  readOnly,
  isFavorite,
  onToggleFavorite,
}: {
  recipe: Recipe
  onEdit?: () => void
  onDelete?: () => void
  readOnly?: boolean
  isFavorite?: boolean
  onToggleFavorite?: () => void
}) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5">
        {recipe.meal.map((m) => (
          <Badge key={m} tone="accent">
            {m}
          </Badge>
        ))}
        {recipe.tags.map((t) => (
          <Badge key={t}>{t}</Badge>
        ))}
        {onToggleFavorite && (
          <span className="ml-auto">
            <FavStar active={!!isFavorite} onToggle={onToggleFavorite} size="md" />
          </span>
        )}
      </div>

      <p className="mt-3 text-sm text-muted">
        Serves {recipe.servings}
        {recipe.prepTime ? ` · prep ${recipe.prepTime}m` : ''}
        {recipe.cookTime ? ` · cook ${recipe.cookTime}m` : ''}
      </p>

      <div className="mt-4 grid gap-5 md:grid-cols-2">
        <div>
          <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neon">
            Ingredients
          </h4>
          <ul className="space-y-1.5 text-sm">
            {recipe.ingredients.map((ing, i) => (
              <li key={i} className="flex justify-between gap-3 border-b border-border/50 pb-1">
                <span>{ing.item}</span>
                <span className="shrink-0 text-muted">{qtyLabel(ing.qty, ing.unit)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neon">Steps</h4>
          <ol className="space-y-2 text-sm">
            {recipe.steps.map((s, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neon/15 text-xs text-neon">
                  {i + 1}
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {recipe.notes && (
        <p className="mt-4 rounded-lg bg-surface-2 p-3 text-sm text-muted">💡 {recipe.notes}</p>
      )}
      {recipe.sourceUrl && (
        <a
          href={recipe.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block text-sm text-neon hover:underline"
        >
          Original source ↗
        </a>
      )}

      {!readOnly && (onEdit || onDelete) && (
        <div className="mt-5 flex gap-2 border-t border-border pt-4">
          {onEdit && (
            <Button variant="primary" onClick={onEdit}>
              Edit recipe
            </Button>
          )}
          {onDelete && (
            <Button variant="danger" onClick={onDelete}>
              Delete
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
