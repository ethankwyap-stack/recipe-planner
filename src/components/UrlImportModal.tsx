import { useState } from 'react'
import type { Recipe } from '../types'
import { fetchRecipeFromUrl } from '../lib/importUrl'
import { Button, Field, Modal, inputClass } from './ui'

export function UrlImportModal({
  open,
  onClose,
  existing,
  onParsed,
}: {
  open: boolean
  onClose: () => void
  existing: Recipe[]
  onParsed: (recipe: Recipe) => void
}) {
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const reset = () => {
    setUrl('')
    setBusy(false)
    setError('')
  }
  const close = () => {
    reset()
    onClose()
  }

  const fetchIt = async () => {
    if (!url.trim()) return
    setBusy(true)
    setError('')
    try {
      const recipe = await fetchRecipeFromUrl(url, existing)
      if (recipe.ingredients.length === 0 && recipe.steps.length === 0) {
        setError(
          "Found the page, but couldn't read a recipe from it. Try 📷 From photo, or paste it with ⬆ Import.",
        )
        setBusy(false)
        return
      }
      onParsed(recipe)
      reset()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong fetching that page.')
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={close} title="🔗 Import a recipe from a website">
      <p className="text-sm text-muted">
        Paste a link to a recipe page (most cooking sites work) and we'll pull in the title,
        ingredients, steps, and times automatically — free, no account. You can review and tweak it
        before saving.
      </p>

      <Field label="Recipe URL">
        <input
          className={inputClass}
          placeholder="https://www.example.com/best-pasta-recipe"
          value={url}
          autoFocus
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !busy && fetchIt()}
        />
      </Field>

      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}

      <p className="mt-3 text-xs text-muted">
        Tip: link straight to the recipe (not a search results or homepage). If a site won't load,
        the photo (📷) or paste (⬆) importers always work.
      </p>

      <div className="mt-4 flex justify-end gap-2 border-t border-border pt-4">
        <Button variant="ghost" onClick={close}>
          Cancel
        </Button>
        <Button variant="primary" disabled={busy || !url.trim()} onClick={fetchIt}>
          {busy ? 'Fetching…' : 'Fetch recipe →'}
        </Button>
      </div>
    </Modal>
  )
}
