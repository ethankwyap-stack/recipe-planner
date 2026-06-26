import { useState } from 'react'
import type { Ingredient, MealType, Recipe } from '../types'
import { recognizeImage, type OcrProgress } from '../lib/ocr'
import { preparePhoto } from '../lib/image'
import { parseIngredientLine, uniqueId } from '../lib/parse'
import { Button, Field, Modal, inputClass } from './ui'

type SlotKey = 'ingredients' | 'instructions'

interface SlotState {
  dataUrl?: string
  text: string
  busy: boolean
  progress: OcrProgress
}

const emptySlot = (): SlotState => ({ text: '', busy: false, progress: { status: '', progress: 0 } })

const HEADING = /^(ingredients|steps|instructions|method|directions|you will need)\s*:?\s*$/i

export function PhotoImportModal({
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
  const [title, setTitle] = useState('')
  const [ingredients, setIngredients] = useState<SlotState>(emptySlot())
  const [instructions, setInstructions] = useState<SlotState>(emptySlot())
  const [error, setError] = useState('')

  const slots: Record<SlotKey, [SlotState, (s: SlotState) => void]> = {
    ingredients: [ingredients, setIngredients],
    instructions: [instructions, setInstructions],
  }

  const reset = () => {
    setTitle('')
    setIngredients(emptySlot())
    setInstructions(emptySlot())
    setError('')
  }

  const close = () => {
    reset()
    onClose()
  }

  const onFile = async (key: SlotKey, file: File) => {
    setError('')
    const [, set] = slots[key]
    set({ ...emptySlot(), busy: true, progress: { status: 'preparing image', progress: 0 } })
    try {
      const { ocrBlob, storedDataUrl } = await preparePhoto(file)
      set({ ...emptySlot(), busy: true, dataUrl: storedDataUrl, progress: { status: 'reading text', progress: 0 } })
      const text = await recognizeImage(ocrBlob, (p) =>
        set({ ...emptySlot(), busy: true, dataUrl: storedDataUrl, progress: p }),
      )
      set({ dataUrl: storedDataUrl, text: cleanLines(text), busy: false, progress: { status: '', progress: 0 } })
    } catch (e) {
      const msg = e instanceof Error ? e.message : typeof e === 'string' ? e : 'unknown error'
      setError(`Couldn't read that photo — ${msg}. A JPG/PNG screenshot also works.`)
      set(emptySlot())
    }
  }

  const hasContent =
    ingredients.text.trim() ||
    instructions.text.trim() ||
    ingredients.dataUrl ||
    instructions.dataUrl

  const create = () => {
    const ings: Ingredient[] = ingredients.text
      .split('\n')
      .filter((l) => l.trim() && !HEADING.test(l))
      .map(parseIngredientLine)
      .filter((x): x is Ingredient => !!x)

    const steps = instructions.text
      .split('\n')
      .map((l) => l.replace(/^[-*•\d.)\s]+/, '').trim())
      .filter((l) => l && !HEADING.test(l))

    const finalTitle =
      title.trim() ||
      ingredients.text.split('\n').find((l) => l.trim()) ||
      'Scanned recipe'

    const recipe: Recipe = {
      id: uniqueId(finalTitle, existing),
      title: finalTitle.slice(0, 80),
      meal: ['dinner'] as MealType[],
      servings: 4,
      ingredients: ings,
      steps,
      tags: [],
      ingredientsPhoto: ingredients.dataUrl,
      instructionsPhoto: instructions.dataUrl,
    }
    onParsed(recipe)
    reset()
  }

  return (
    <Modal open={open} onClose={close} title="📷 Add a recipe from photos" wide>
      <p className="text-sm text-muted">
        Take or pick a photo for the <strong className="text-text">ingredients</strong> and one for
        the <strong className="text-text">instructions</strong>. The text is read in your browser
        (free, nothing uploaded), and <strong className="text-text">both photos are saved on the
        recipe</strong> so you can always look at the original.
      </p>

      <Field label="Recipe name">
        <input
          className={inputClass}
          placeholder="e.g. Strawberry Shortcakes"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </Field>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <PhotoSlot
          label="📋 Ingredients photo"
          slot={ingredients}
          onFile={(f) => onFile('ingredients', f)}
          onTextChange={(t) => setIngredients((s) => ({ ...s, text: t }))}
          placeholder="One ingredient per line…"
        />
        <PhotoSlot
          label="👩‍🍳 Instructions photo"
          slot={instructions}
          onFile={(f) => onFile('instructions', f)}
          onTextChange={(t) => setInstructions((s) => ({ ...s, text: t }))}
          placeholder="One step per line…"
        />
      </div>

      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}

      <p className="mt-3 text-xs text-muted">
        Tip: a flat, straight-on photo with good light reads best. You can fix the text in the next
        screen — and the photos stay attached either way.
      </p>

      <div className="mt-4 flex justify-end gap-2 border-t border-border pt-4">
        <Button variant="ghost" onClick={close}>
          Cancel
        </Button>
        <Button variant="primary" disabled={!hasContent} onClick={create}>
          Create recipe →
        </Button>
      </div>
    </Modal>
  )
}

function PhotoSlot({
  label,
  slot,
  onFile,
  onTextChange,
  placeholder,
}: {
  label: string
  slot: SlotState
  onFile: (f: File) => void
  onTextChange: (t: string) => void
  placeholder: string
}) {
  const pct = Math.round(slot.progress.progress * 100)
  return (
    <div className="rounded-xl border border-border bg-surface-2 p-3">
      <h4 className="mb-2 text-sm font-semibold text-neon">{label}</h4>

      {slot.dataUrl ? (
        <img
          src={slot.dataUrl}
          alt={label}
          className="mb-2 max-h-44 w-full rounded-lg border border-border object-contain"
        />
      ) : null}

      {slot.busy ? (
        <div className="mb-2">
          <p className="text-xs capitalize text-muted">{slot.progress.status || 'working…'}</p>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface">
            <div className="h-full bg-neon transition-all" style={{ width: `${Math.max(5, pct)}%` }} />
          </div>
        </div>
      ) : (
        <div className="mb-2 flex flex-wrap gap-2">
          <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-neon px-3 py-1.5 text-xs font-semibold text-bg hover:brightness-110">
            📷 Take
            <input
              type="file"
              accept="image/*,.heic,.heif"
              capture="environment"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
            />
          </label>
          <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs hover:border-neon/60">
            🖼 {slot.dataUrl ? 'Replace' : 'Choose'}
            <input
              type="file"
              accept="image/*,.heic,.heif"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
            />
          </label>
        </div>
      )}

      {(slot.dataUrl || slot.text) && (
        <textarea
          className={`${inputClass} min-h-[120px] font-mono text-xs`}
          placeholder={placeholder}
          value={slot.text}
          onChange={(e) => onTextChange(e.target.value)}
        />
      )}
    </div>
  )
}

function cleanLines(text: string): string {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter((l, i, a) => l || (i > 0 && a[i - 1])) // collapse runs of blank lines
    .join('\n')
    .trim()
}
