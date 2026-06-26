import { useMemo, useState } from 'react'
import type { MealType, Recipe } from '../types'
import { RecipeCard } from '../components/RecipeCard'
import { RecipeDetail } from '../components/RecipeDetail'
import { RecipeForm } from '../components/RecipeForm'
import { ImportModal } from '../components/ImportModal'
import { PhotoImportModal } from '../components/PhotoImportModal'
import { Badge, Button, Modal } from '../components/ui'

export function Library({
  recipes,
  onSave,
  onDelete,
  onImport,
  favorites,
  onToggleFavorite,
}: {
  recipes: Recipe[]
  onSave: (r: Recipe) => void
  onDelete: (id: string) => void
  onImport: (rs: Recipe[]) => void
  favorites: Set<string>
  onToggleFavorite: (id: string) => void
}) {
  const [q, setQ] = useState('')
  const [mealFilter, setMealFilter] = useState<MealType | null>(null)
  const [favsOnly, setFavsOnly] = useState(false)
  const [activeTags, setActiveTags] = useState<string[]>([])
  const [viewing, setViewing] = useState<Recipe | null>(null)
  const [editing, setEditing] = useState<Recipe | null>(null)
  const [adding, setAdding] = useState(false)
  const [importing, setImporting] = useState(false)
  const [photoOpen, setPhotoOpen] = useState(false)
  const [prefill, setPrefill] = useState<Recipe | null>(null)

  const allTags = useMemo(() => {
    const set = new Set<string>()
    recipes.forEach((r) => r.tags.forEach((t) => set.add(t)))
    return [...set].sort()
  }, [recipes])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return recipes.filter((r) => {
      if (favsOnly && !favorites.has(r.id)) return false
      if (mealFilter && !r.meal.includes(mealFilter)) return false
      if (activeTags.length && !activeTags.every((t) => r.tags.includes(t))) return false
      if (
        term &&
        !r.title.toLowerCase().includes(term) &&
        !r.ingredients.some((i) => i.item.toLowerCase().includes(term)) &&
        !r.tags.some((t) => t.toLowerCase().includes(term))
      )
        return false
      return true
    })
  }, [recipes, q, mealFilter, activeTags, favsOnly, favorites])

  const toggleTag = (t: string) =>
    setActiveTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]))

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          className="min-w-[200px] flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-neon/60"
          placeholder="Search recipes, ingredients, tags…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Button variant="ghost" onClick={() => setPhotoOpen(true)}>
          📷 From photo
        </Button>
        <Button variant="ghost" onClick={() => setImporting(true)}>
          ⬆ Import
        </Button>
        <Button variant="primary" onClick={() => setAdding(true)}>
          + New recipe
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        <Badge tone="accent" active={favsOnly} onClick={() => setFavsOnly((v) => !v)}>
          ★ favorites
        </Badge>
        {(['lunch', 'dinner'] as MealType[]).map((m) => (
          <Badge
            key={m}
            tone="accent"
            active={mealFilter === m}
            onClick={() => setMealFilter((cur) => (cur === m ? null : m))}
          >
            {m}
          </Badge>
        ))}
        {allTags.map((t) => (
          <Badge key={t} active={activeTags.includes(t)} onClick={() => toggleTag(t)}>
            {t}
          </Badge>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted">
          No recipes match. Try clearing filters, or add / import recipes.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((r) => (
            <RecipeCard
              key={r.id}
              recipe={r}
              onClick={() => setViewing(r)}
              isFavorite={favorites.has(r.id)}
              onToggleFavorite={() => onToggleFavorite(r.id)}
            />
          ))}
        </div>
      )}

      {/* View */}
      <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing?.title ?? ''} wide>
        {viewing && (
          <RecipeDetail
            recipe={viewing}
            isFavorite={favorites.has(viewing.id)}
            onToggleFavorite={() => onToggleFavorite(viewing.id)}
            onEdit={() => {
              setEditing(viewing)
              setViewing(null)
            }}
            onDelete={() => {
              if (confirm(`Delete "${viewing.title}"?`)) {
                onDelete(viewing.id)
                setViewing(null)
              }
            }}
          />
        )}
      </Modal>

      {/* Add */}
      <Modal open={adding} onClose={() => setAdding(false)} title="New recipe" wide>
        <RecipeForm
          existing={recipes}
          onCancel={() => setAdding(false)}
          onSave={(r) => {
            onSave(r)
            setAdding(false)
          }}
        />
      </Modal>

      {/* Edit */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title={`Edit: ${editing?.title ?? ''}`} wide>
        {editing && (
          <RecipeForm
            initial={editing}
            existing={recipes}
            onCancel={() => setEditing(null)}
            onSave={(r) => {
              onSave(r)
              setEditing(null)
            }}
          />
        )}
      </Modal>

      <ImportModal
        open={importing}
        onClose={() => setImporting(false)}
        existing={recipes}
        onImport={onImport}
      />

      {/* Photo → OCR → best-effort recipe, then review in the form before saving */}
      <PhotoImportModal
        open={photoOpen}
        onClose={() => setPhotoOpen(false)}
        existing={recipes}
        onParsed={(r) => {
          setPhotoOpen(false)
          setPrefill(r)
        }}
      />
      <Modal open={!!prefill} onClose={() => setPrefill(null)} title="Review scanned recipe" wide>
        {prefill && (
          <RecipeForm
            initial={prefill}
            existing={recipes}
            onCancel={() => setPrefill(null)}
            onSave={(r) => {
              onSave(r)
              setPrefill(null)
            }}
          />
        )}
      </Modal>
    </div>
  )
}
