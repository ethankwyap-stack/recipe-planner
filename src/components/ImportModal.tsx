import { useState } from 'react'
import type { Recipe } from '../types'
import { parseRecipeText } from '../lib/parse'
import { Button, Modal, inputClass } from './ui'

const SAMPLE = `Tomato Basil Soup
Ingredients
- 2 can chopped tomatoes
- 1 onion
- 2 clove garlic
- 200 ml cream
Steps
1. Soften onion and garlic.
2. Add tomatoes, simmer 20 minutes.
3. Blend, stir in cream, season.

---

Greek Salad
Ingredients
- 3 tomato
- 1 cucumber
- 150 g feta cheese
- olive oil
Steps
1. Chop everything, toss with oil.`

export function ImportModal({
  open,
  onClose,
  existing,
  onImport,
}: {
  open: boolean
  onClose: () => void
  existing: Recipe[]
  onImport: (recipes: Recipe[]) => void
}) {
  const [mode, setMode] = useState<'text' | 'json'>('text')
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<Recipe[] | null>(null)

  const handleParse = () => {
    setError('')
    try {
      if (mode === 'json') {
        const parsed = JSON.parse(text)
        const arr: Recipe[] = Array.isArray(parsed) ? parsed : [parsed]
        if (!arr.every((r) => r && r.title)) throw new Error('Each recipe needs a title.')
        setPreview(arr)
      } else {
        const parsed = parseRecipeText(text, existing)
        if (parsed.length === 0) throw new Error('No recipes found. Check the format below.')
        setPreview(parsed)
      }
    } catch (e) {
      setPreview(null)
      setError(e instanceof Error ? e.message : 'Could not parse input.')
    }
  }

  const onFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      setMode('json')
      setText(String(reader.result))
    }
    reader.readAsText(file)
  }

  const confirm = () => {
    if (preview) onImport(preview)
    setText('')
    setPreview(null)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Import recipes" wide>
      <div className="mb-3 flex gap-2 no-print">
        <Button variant={mode === 'text' ? 'primary' : 'ghost'} onClick={() => setMode('text')}>
          Paste text
        </Button>
        <Button variant={mode === 'json' ? 'primary' : 'ghost'} onClick={() => setMode('json')}>
          JSON / file
        </Button>
        {mode === 'text' && (
          <Button variant="subtle" onClick={() => setText(SAMPLE)}>
            Load example
          </Button>
        )}
        {mode === 'json' && (
          <label className="inline-flex cursor-pointer items-center rounded-lg bg-surface-2 px-3.5 py-2 text-sm hover:bg-border">
            Choose file…
            <input
              type="file"
              accept=".json,.txt"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
            />
          </label>
        )}
      </div>

      <textarea
        className={`${inputClass} min-h-[220px] font-mono text-xs`}
        placeholder={
          mode === 'text'
            ? 'Paste one or more recipes. Separate recipes with a line of --- .'
            : 'Paste a recipes.json array, or choose a file.'
        }
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setPreview(null)
        }}
      />

      {error && <p className="mt-2 text-sm text-red-300">{error}</p>}

      {preview && (
        <div className="mt-3 rounded-lg border border-neon/30 bg-neon/5 p-3">
          <p className="text-sm text-neon">Found {preview.length} recipe(s):</p>
          <ul className="mt-1 list-inside list-disc text-sm text-muted">
            {preview.map((r) => (
              <li key={r.id}>
                {r.title}{' '}
                <span className="text-xs">
                  ({r.ingredients.length} ingredients, {r.steps.length} steps)
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 flex justify-end gap-2 border-t border-border pt-4">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        {preview ? (
          <Button variant="primary" onClick={confirm}>
            Add {preview.length} to library
          </Button>
        ) : (
          <Button variant="primary" disabled={!text.trim()} onClick={handleParse}>
            Preview
          </Button>
        )}
      </div>
    </Modal>
  )
}
