import { useState } from 'react'
import type { Ingredient, MealType, Recipe } from '../types'
import { recognizeImage, type OcrProgress } from '../lib/ocr'
import { preparePhoto } from '../lib/image'
import { parseIngredientLine, uniqueId } from '../lib/parse'
import { Button, Field, Modal, inputClass } from './ui'

type SlotKey = 'ingredients' | 'instructions'

interface SlotState {
  photos: string[] // stored data URLs, one per page
  text: string // combined OCR text (editable)
  busy: boolean
  progress: OcrProgress
}

const emptySlot = (): SlotState => ({ photos: [], text: '', busy: false, progress: { status: '', progress: 0 } })

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

  const setters: Record<SlotKey, (fn: (s: SlotState) => SlotState) => void> = {
    ingredients: setIngredients,
    instructions: setInstructions,
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

  // Process one or more pages: each is downscaled, stored, OCR'd, and its text appended.
  const addFiles = async (key: SlotKey, files: FileList) => {
    setError('')
    const set = setters[key]
    const list = Array.from(files)
    for (const file of list) {
      set((s) => ({ ...s, busy: true, progress: { status: 'preparing image', progress: 0 } }))
      try {
        const { ocrBlob, storedDataUrl } = await preparePhoto(file)
        set((s) => ({ ...s, photos: [...s.photos, storedDataUrl] }))
        const text = await recognizeImage(ocrBlob, (p) =>
          set((s) => ({ ...s, busy: true, progress: p })),
        )
        set((s) => ({
          ...s,
          text: [s.text.trim(), cleanLines(text)].filter(Boolean).join('\n'),
          busy: false,
          progress: { status: '', progress: 0 },
        }))
      } catch (e) {
        const msg = e instanceof Error ? e.message : typeof e === 'string' ? e : 'unknown error'
        setError(`Couldn't read one photo — ${msg}. A JPG/PNG screenshot also works.`)
        set((s) => ({ ...s, busy: false, progress: { status: '', progress: 0 } }))
      }
    }
  }

  const removePhoto = (key: SlotKey, idx: number) =>
    setters[key]((s) => ({ ...s, photos: s.photos.filter((_, i) => i !== idx) }))

  const hasContent =
    ingredients.text.trim() ||
    instructions.text.trim() ||
    ingredients.photos.length ||
    instructions.photos.length

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
      title.trim() || ingredients.text.split('\n').find((l) => l.trim()) || 'Scanned recipe'

    const recipe: Recipe = {
      id: uniqueId(finalTitle, existing),
      title: finalTitle.slice(0, 80),
      meal: ['dinner'] as MealType[],
      servings: 4,
      ingredients: ings,
      steps,
      tags: [],
      ingredientsPhotos: ingredients.photos.length ? ingredients.photos : undefined,
      instructionsPhotos: instructions.photos.length ? instructions.photos : undefined,
    }
    onParsed(recipe)
    reset()
  }

  return (
    <Modal open={open} onClose={close} title="📷 Add a recipe from photos" wide>
      <p className="text-sm text-muted">
        Add one or more photos for the <strong className="text-text">ingredients</strong> and the{' '}
        <strong className="text-text">instructions</strong> — multi-page recipes are fine, just add
        each page. Text is read in your browser (free), and{' '}
        <strong className="text-text">every photo is saved on the recipe</strong>.
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
          label="📋 Ingredients photos"
          slot={ingredients}
          onFiles={(f) => addFiles('ingredients', f)}
          onRemove={(i) => removePhoto('ingredients', i)}
          onTextChange={(t) => setIngredients((s) => ({ ...s, text: t }))}
          placeholder="One ingredient per line…"
        />
        <PhotoSlot
          label="👩‍🍳 Instructions photos"
          slot={instructions}
          onFiles={(f) => addFiles('instructions', f)}
          onRemove={(i) => removePhoto('instructions', i)}
          onTextChange={(t) => setInstructions((s) => ({ ...s, text: t }))}
          placeholder="One step per line…"
        />
      </div>

      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}

      <p className="mt-3 text-xs text-muted">
        Tip: a flat, straight-on photo with good light reads best. You can fix the text next — the
        photos stay attached either way.
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
  onFiles,
  onRemove,
  onTextChange,
  placeholder,
}: {
  label: string
  slot: SlotState
  onFiles: (files: FileList) => void
  onRemove: (idx: number) => void
  onTextChange: (t: string) => void
  placeholder: string
}) {
  const pct = Math.round(slot.progress.progress * 100)
  return (
    <div className="rounded-xl border border-border bg-surface-2 p-3">
      <h4 className="mb-2 text-sm font-semibold text-neon">{label}</h4>

      {slot.photos.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {slot.photos.map((p, i) => (
            <div key={i} className="relative">
              <img src={p} alt={`page ${i + 1}`} className="h-16 w-16 rounded-lg border border-border object-cover" />
              <button
                onClick={() => onRemove(i)}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-surface text-xs text-muted hover:text-red-300"
                aria-label="Remove page"
              >
                ✕
              </button>
              <span className="absolute bottom-0.5 left-0.5 rounded bg-black/60 px-1 text-[10px] text-white">
                {i + 1}
              </span>
            </div>
          ))}
        </div>
      )}

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
              onChange={(e) => e.target.files?.length && onFiles(e.target.files)}
            />
          </label>
          <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs hover:border-neon/60">
            🖼 Add page(s)
            <input
              type="file"
              accept="image/*,.heic,.heif"
              multiple
              className="hidden"
              onChange={(e) => e.target.files?.length && onFiles(e.target.files)}
            />
          </label>
        </div>
      )}

      {(slot.photos.length > 0 || slot.text) && (
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
    .filter((l, i, a) => l || (i > 0 && a[i - 1]))
    .join('\n')
    .trim()
}
