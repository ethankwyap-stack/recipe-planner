import { useState } from 'react'
import type { Recipe } from '../types'
import { recipePhotos } from '../types'
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
          <PhotoGallery photos={recipePhotos(recipe, 'ingredients')} caption="Original ingredients" />
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
          <PhotoGallery photos={recipePhotos(recipe, 'instructions')} caption="Original instructions" />
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

function PhotoGallery({ photos, caption }: { photos: string[]; caption: string }) {
  const [open, setOpen] = useState<string | null>(null)
  if (photos.length === 0) return null
  return (
    <div className="mt-3">
      <span className="mb-1 block text-xs text-muted">
        📷 {caption} ({photos.length} {photos.length === 1 ? 'photo' : 'photos'}) — tap to enlarge
      </span>
      <div className="flex flex-wrap gap-2">
        {photos.map((src, i) => (
          <button key={i} onClick={() => setOpen(src)} title="Tap to enlarge" className="relative">
            <img
              src={src}
              alt={`${caption} ${i + 1}`}
              className="h-24 w-24 rounded-lg border border-border object-cover transition hover:border-neon/50"
            />
            {photos.length > 1 && (
              <span className="absolute bottom-0.5 left-0.5 rounded bg-black/60 px-1 text-[10px] text-white">
                {i + 1}
              </span>
            )}
          </button>
        ))}
      </div>
      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setOpen(null)}
        >
          <img src={open} alt={caption} className="max-h-[90vh] max-w-full rounded-lg" />
        </div>
      )}
    </div>
  )
}
