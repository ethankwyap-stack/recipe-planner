import { useEffect, useMemo, useState } from 'react'
import type { Recipe, SharedPlan, WeekPlan } from './types'
import { Library } from './pages/Library'
import { Planner } from './pages/Planner'
import { Cook } from './pages/Cook'
import { SharedPlanView } from './pages/SharedPlanView'
import { ShareModal } from './components/ShareModal'
import { SettingsModal } from './components/SettingsModal'
import { Button } from './components/ui'
import {
  clearShareHash,
  readSharedPlanFromHash,
} from './lib/share'
import {
  hasDraft,
  loadPlan,
  loadRecipes,
  savePlan,
  saveDraft,
} from './lib/storage'
import { emptyWeek, isoDate, mondayOf } from './lib/week'
import { loadFavorites, saveFavorites } from './lib/favorites'

type Tab = 'planner' | 'library' | 'cook'

export default function App() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loaded, setLoaded] = useState(false)
  const [draft, setDraft] = useState(hasDraft())
  const [tab, setTab] = useState<Tab>('planner')
  const [week, setWeekState] = useState<WeekPlan>(() => {
    const stored = loadPlan<WeekPlan>()
    return stored ?? emptyWeek(isoDate(mondayOf(new Date())), 2)
  })
  const [sharing, setSharing] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [favorites, setFavorites] = useState<Set<string>>(() => loadFavorites())

  const toggleFavorite = (id: string) =>
    setFavorites((cur) => {
      const next = new Set(cur)
      next.has(id) ? next.delete(id) : next.add(id)
      saveFavorites(next)
      return next
    })

  // A shared plan opened via #plan=… short-circuits the whole app into read-only mode.
  const [shared, setShared] = useState<SharedPlan | null>(() => readSharedPlanFromHash())

  useEffect(() => {
    loadRecipes()
      .then(({ recipes }) => setRecipes(recipes))
      .catch(() => setRecipes([]))
      .finally(() => setLoaded(true))
  }, [])

  const setWeek = (w: WeekPlan) => {
    setWeekState(w)
    savePlan(w)
  }

  // Persist recipe edits as a local draft so nothing is lost before publishing.
  const commitLocal = (next: Recipe[]) => {
    setRecipes(next)
    saveDraft(next)
    setDraft(true)
  }

  const saveRecipe = (r: Recipe) =>
    commitLocal(
      recipes.some((x) => x.id === r.id)
        ? recipes.map((x) => (x.id === r.id ? r : x))
        : [...recipes, r],
    )

  const deleteRecipe = (id: string) => commitLocal(recipes.filter((r) => r.id !== id))

  const importRecipes = (incoming: Recipe[]) => {
    // De-dupe by id; incoming wins on collision.
    const map = new Map(recipes.map((r) => [r.id, r]))
    incoming.forEach((r) => map.set(r.id, r))
    commitLocal([...map.values()])
  }

  const onSettingsCommitted = () => setDraft(false)

  const saveSharedCopy = () => {
    if (!shared) return
    importRecipes(shared.recipes)
    setWeek({ ...shared.plan })
    clearShareHash()
    setShared(null)
    setTab('planner')
  }

  const tabBtn = (id: Tab, label: string) => (
    <button
      onClick={() => setTab(id)}
      className={`rounded-lg px-3.5 py-1.5 text-sm transition ${
        tab === id ? 'bg-neon/15 text-neon' : 'text-muted hover:text-text'
      }`}
    >
      {label}
    </button>
  )

  const recipeCount = useMemo(() => recipes.length, [recipes])

  if (shared) {
    return (
      <SharedPlanView
        shared={shared}
        onSaveCopy={saveSharedCopy}
        onExit={() => {
          clearShareHash()
          setShared(null)
        }}
      />
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-5">
      <header className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🍳</span>
          <h1 className="text-xl font-bold tracking-tight">
            Mise <span className="text-muted">·</span>{' '}
            <span className="text-neon">meal planner</span>
          </h1>
        </div>

        <nav className="ml-2 flex gap-1 rounded-xl border border-border bg-surface p-1">
          {tabBtn('planner', 'Planner')}
          {tabBtn('library', `Recipes${recipeCount ? ` (${recipeCount})` : ''}`)}
          {tabBtn('cook', 'Cook')}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {draft && (
            <span className="rounded-full bg-accent/15 px-2.5 py-1 text-xs text-accent">
              Unpublished changes
            </span>
          )}
          <Button variant="ghost" onClick={() => setSettingsOpen(true)}>
            Publish
          </Button>
        </div>
      </header>

      {!loaded ? (
        <p className="text-muted">Loading your recipe box…</p>
      ) : tab === 'planner' ? (
        <Planner
          week={week}
          setWeek={setWeek}
          recipes={recipes}
          favorites={favorites}
          onShare={() => setSharing(true)}
        />
      ) : tab === 'cook' ? (
        <Cook recipes={recipes} favorites={favorites} onToggleFavorite={toggleFavorite} />
      ) : (
        <Library
          recipes={recipes}
          onSave={saveRecipe}
          onDelete={deleteRecipe}
          onImport={importRecipes}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
        />
      )}

      <ShareModal open={sharing} onClose={() => setSharing(false)} week={week} recipes={recipes} />
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        recipes={recipes}
        onCommitted={onSettingsCommitted}
      />

      <footer className="mt-12 border-t border-border pt-4 text-center text-xs text-muted no-print">
        Mise — your recipes live inside this site. Free, no accounts, share by link.
      </footer>
    </div>
  )
}
