import { useMemo, useState } from 'react'
import type { Recipe } from '../types'
import { findCookable } from '../lib/cook'
import { qtyLabel } from '../lib/units'
import { RecipeDetail } from '../components/RecipeDetail'
import { FavStar } from '../components/FavStar'
import { Badge, Button, Modal, inputClass } from '../components/ui'

export function Cook({
  recipes,
  favorites,
  onToggleFavorite,
}: {
  recipes: Recipe[]
  favorites: Set<string>
  onToggleFavorite: (id: string) => void
}) {
  const [pantry, setPantry] = useState<string[]>([])
  const [draft, setDraft] = useState('')
  const [maxMissing, setMaxMissing] = useState(2)
  const [viewing, setViewing] = useState<Recipe | null>(null)

  // Suggest ingredients from the library so adding is quick.
  const vocab = useMemo(() => {
    const set = new Set<string>()
    recipes.forEach((r) => r.ingredients.forEach((i) => set.add(i.item.toLowerCase())))
    return [...set].sort()
  }, [recipes])

  const addItems = (raw: string) => {
    const parts = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (parts.length === 0) return
    setPantry((cur) => [...new Set([...cur, ...parts.map((p) => p.toLowerCase())])])
    setDraft('')
  }

  const removeItem = (item: string) => setPantry((cur) => cur.filter((x) => x !== item))

  const matches = useMemo(() => findCookable(recipes, pantry), [recipes, pantry])
  const shown = matches.filter((m) => m.missing.length <= maxMissing)

  return (
    <div>
      <div className="mb-4 rounded-xl border border-border bg-surface p-4">
        <h2 className="text-lg font-semibold">🧑‍🍳 Cook from what I have</h2>
        <p className="mt-1 text-sm text-muted">
          List the ingredients you've got and I'll find recipes you can make right now (or with just
          a couple of extras). Salt, pepper, oil, butter and water are assumed.
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <input
            className={`${inputClass} min-w-[220px] flex-1`}
            placeholder="Type an ingredient and press Enter (or comma-separate a few)…"
            value={draft}
            list="ingredient-vocab"
            onChange={(e) => {
              if (e.target.value.includes(',')) addItems(e.target.value)
              else setDraft(e.target.value)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addItems(draft)
              }
            }}
          />
          <datalist id="ingredient-vocab">
            {vocab.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
          <Button variant="primary" onClick={() => addItems(draft)} disabled={!draft.trim()}>
            Add
          </Button>
        </div>

        {pantry.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {pantry.map((p) => (
              <span
                key={p}
                className="inline-flex items-center gap-1 rounded-full border border-neon/30 bg-neon/10 px-2.5 py-0.5 text-xs text-neon"
              >
                {p}
                <button onClick={() => removeItem(p)} className="hover:text-text" aria-label="Remove">
                  ✕
                </button>
              </span>
            ))}
            <button className="ml-1 text-xs text-muted hover:text-red-300" onClick={() => setPantry([])}>
              clear all
            </button>
          </div>
        )}

        <label className="mt-3 flex items-center gap-2 text-sm text-muted">
          Show recipes missing at most
          <select
            className="rounded-lg border border-border bg-surface-2 px-2 py-1 text-text"
            value={maxMissing}
            onChange={(e) => setMaxMissing(Number(e.target.value))}
          >
            <option value={0}>0 (ready to cook)</option>
            <option value={1}>1 ingredient</option>
            <option value={2}>2 ingredients</option>
            <option value={3}>3 ingredients</option>
          </select>
        </label>
      </div>

      {pantry.length === 0 ? (
        <p className="rounded-lg bg-surface-2 p-4 text-sm text-muted">
          Add a few ingredients above to get started — e.g. <em>chicken, garlic, lemon</em>.
        </p>
      ) : shown.length === 0 ? (
        <p className="rounded-lg bg-surface-2 p-4 text-sm text-muted">
          Nothing matches yet. Try adding more ingredients, or allow more missing items.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map(({ recipe, missing, coverage }) => (
            <div
              key={recipe.id}
              className="group relative flex flex-col rounded-xl border border-border bg-surface p-4"
            >
              <div className="absolute right-2.5 top-2.5">
                <FavStar active={favorites.has(recipe.id)} onToggle={() => onToggleFavorite(recipe.id)} />
              </div>
              <button onClick={() => setViewing(recipe)} className="text-left">
                <h3 className="pr-6 font-semibold leading-snug group-hover:text-neon">
                  {recipe.title}
                </h3>
              </button>
              <div className="mt-2">
                {missing.length === 0 ? (
                  <Badge tone="neon">✓ ready to cook</Badge>
                ) : (
                  <Badge tone="accent">
                    missing {missing.length} · {Math.round(coverage * 100)}% there
                  </Badge>
                )}
              </div>
              {missing.length > 0 && (
                <p className="mt-2 text-xs text-muted">
                  Need:{' '}
                  {missing.map((m, i) => (
                    <span key={m.item}>
                      {i > 0 && ', '}
                      <span className="text-text">{m.item}</span>
                      {m.qty ? <span className="text-muted/70"> ({qtyLabel(m.qty, m.unit)})</span> : null}
                    </span>
                  ))}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing?.title ?? ''} wide>
        {viewing && (
          <RecipeDetail
            recipe={viewing}
            readOnly
            isFavorite={favorites.has(viewing.id)}
            onToggleFavorite={() => onToggleFavorite(viewing.id)}
          />
        )}
      </Modal>
    </div>
  )
}
