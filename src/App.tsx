import { useEffect, useMemo, useRef, useState } from 'react'
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
  clearDraft,
  hasDraft,
  loadPlan,
  loadRecipes,
  savePlan,
  saveDraft,
} from './lib/storage'
import { commitRecipes, isConfigured, loadRepoConfig } from './lib/github'
import { emptyWeek, isoDate, mondayOf } from './lib/week'
import { loadFavorites, saveFavorites } from './lib/favorites'

type Tab = 'planner' | 'library' | 'cook'
type PublishState =
  | { kind: 'idle' }
  | { kind: 'publishing' }
  | { kind: 'published' }
  | { kind: 'error'; msg: string }

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
  const [publish, setPublish] = useState<PublishState>({ kind: 'idle' })

  // Auto-publish: after a one-time token setup, recipe changes commit themselves
  // to recipes.json (debounced so rapid edits become one commit). Latest list is
  // kept in a ref so the delayed commit always sends the newest data.
  const pendingRecipes = useRef<Recipe[]>([])
  const publishTimer = useRef<number | undefined>(undefined)

  const runPublish = async () => {
    const cfg = loadRepoConfig()
    if (!isConfigured(cfg) || cfg.autoPublish === false) return
    setPublish({ kind: 'publishing' })
    try {
      await commitRecipes(cfg, pendingRecipes.current)
      clearDraft()
      setDraft(false)
      setPublish({ kind: 'published' })
      window.setTimeout(() => setPublish((p) => (p.kind === 'published' ? { kind: 'idle' } : p)), 3000)
    } catch (e) {
      setPublish({ kind: 'error', msg: e instanceof Error ? e.message : 'Publish failed' })
    }
  }

  const schedulePublish = () => {
    const cfg = loadRepoConfig()
    if (!isConfigured(cfg) || cfg.autoPublish === false) return
    window.clearTimeout(publishTimer.current)
    publishTimer.current = window.setTimeout(runPublish, 1500)
  }

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

  // Persist recipe edits as a local draft (so nothing is lost), then auto-publish
  // to the live site if a token is configured.
  const commitLocal = (next: Recipe[]) => {
    setRecipes(next)
    saveDraft(next)
    setDraft(true)
    pendingRecipes.current = next
    schedulePublish()
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

  const onSettingsCommitted = () => {
    setDraft(false)
    setPublish({ kind: 'published' })
    window.setTimeout(() => setPublish((p) => (p.kind === 'published' ? { kind: 'idle' } : p)), 3000)
  }

  // Closing settings: if a token is now configured and a draft is still pending,
  // push it up automatically so the user never has to think about publishing.
  const closeSettings = () => {
    setSettingsOpen(false)
    if (draft) {
      pendingRecipes.current = recipes
      schedulePublish()
    }
  }

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
          <PublishIndicator
            publish={publish}
            draft={draft}
            onOpenSettings={() => setSettingsOpen(true)}
            onRetry={runPublish}
          />
          <Button variant="ghost" onClick={() => setSettingsOpen(true)}>
            ⚙ Publish settings
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
        onClose={closeSettings}
        recipes={recipes}
        onCommitted={onSettingsCommitted}
      />

      <footer className="mt-12 border-t border-border pt-4 text-center text-xs text-muted no-print">
        Mise — your recipes live inside this site. Free, no accounts, share by link.
      </footer>
    </div>
  )
}

function PublishIndicator({
  publish,
  draft,
  onOpenSettings,
  onRetry,
}: {
  publish: PublishState
  draft: boolean
  onOpenSettings: () => void
  onRetry: () => void
}) {
  const cfg = loadRepoConfig()
  const autoOn = isConfigured(cfg) && cfg.autoPublish !== false
  const pill = 'rounded-full px-2.5 py-1 text-xs'

  if (publish.kind === 'publishing')
    return <span className={`${pill} bg-neon/15 text-neon`}>⏳ Publishing…</span>

  if (publish.kind === 'published')
    return <span className={`${pill} bg-neon/15 text-neon`}>✓ Published — live</span>

  if (publish.kind === 'error')
    return (
      <button
        className={`${pill} bg-red-500/15 text-red-300 hover:bg-red-500/25`}
        onClick={onRetry}
        title={publish.msg}
      >
        ⚠ Publish failed — retry
      </button>
    )

  // idle
  if (autoOn && !draft)
    return <span className={`${pill} bg-neon/10 text-neon`}>● Auto-publish on</span>

  if (draft)
    return (
      <button className={`${pill} bg-accent/15 text-accent hover:bg-accent/25`} onClick={onOpenSettings}>
        {autoOn ? 'Unpublished changes' : 'Saved locally · turn on auto-publish'}
      </button>
    )

  return null
}
