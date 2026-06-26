import { useState } from 'react'
import type { MealType, Recipe } from '../types'
import { recognizeImage, type OcrProgress } from '../lib/ocr'
import { toReadableImage } from '../lib/image'
import { parseRecipeText, uniqueId } from '../lib/parse'
import { Button, Modal, inputClass } from './ui'

type Stage = 'pick' | 'scanning' | 'review'

export function PhotoImportModal({
  open,
  onClose,
  existing,
  onParsed,
}: {
  open: boolean
  onClose: () => void
  existing: Recipe[]
  /** Hands back a best-effort recipe for the user to review & save. */
  onParsed: (recipe: Recipe) => void
}) {
  const [stage, setStage] = useState<Stage>('pick')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [progress, setProgress] = useState<OcrProgress>({ status: '', progress: 0 })
  const [text, setText] = useState('')
  const [error, setError] = useState('')

  const reset = () => {
    setStage('pick')
    setImageUrl((url) => {
      if (url) URL.revokeObjectURL(url)
      return null
    })
    setProgress({ status: '', progress: 0 })
    setText('')
    setError('')
  }

  const close = () => {
    reset()
    onClose()
  }

  const onFile = async (file: File) => {
    setError('')
    setStage('scanning')
    setProgress({ status: 'preparing image', progress: 0 })
    try {
      // Convert HEIC/HEIF (iPhone/Mac photos) to JPEG so the browser & OCR can read it.
      const img = await toReadableImage(file)
      setImageUrl(URL.createObjectURL(img))
      const out = await recognizeImage(img, setProgress)
      setText(out.trim())
      setStage('review')
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : typeof e === 'string' ? e : JSON.stringify(e)
      setError(`Could not read the photo — ${msg}. A JPG/PNG screenshot also works.`)
      setStage('pick')
    }
  }

  const createRecipe = () => {
    const parsed = parseRecipeText(text, existing)
    let recipe = parsed[0]
    if (!recipe) {
      // OCR text wasn't structured enough to auto-split — keep everything in notes
      // so nothing is lost, and let the user organise it in the form.
      const firstLine = text.split('\n').find((l) => l.trim()) ?? 'Scanned recipe'
      recipe = {
        id: uniqueId(firstLine, existing),
        title: firstLine.slice(0, 60),
        meal: ['dinner'] as MealType[],
        servings: 4,
        ingredients: [],
        steps: [],
        tags: [],
        notes: text,
      }
    }
    onParsed(recipe)
    reset()
  }

  const pct = Math.round(progress.progress * 100)

  return (
    <Modal open={open} onClose={close} title="📷 Add a recipe from a photo" wide>
      {stage === 'pick' && (
        <div>
          <p className="text-sm text-muted">
            Snap a photo of a recipe card, cookbook page, or handwritten note. The text is read
            right here in your browser — nothing is uploaded to any server, and it's free.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-neon px-4 py-2.5 text-sm font-semibold text-bg hover:brightness-110">
              📷 Take photo
              <input
                type="file"
                accept="image/*,.heic,.heif"
                capture="environment"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
              />
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm hover:border-neon/60">
              🖼 Choose an image
              <input
                type="file"
                accept="image/*,.heic,.heif"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
              />
            </label>
          </div>
          {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
          <p className="mt-4 text-xs text-muted">
            Tip: a flat, well-lit photo with clear printed text reads best. You'll get a chance to
            fix anything before saving.
          </p>
        </div>
      )}

      {stage === 'scanning' && (
        <div className="py-2">
          {imageUrl && (
            <img
              src={imageUrl}
              alt="recipe"
              className="mx-auto mb-4 max-h-56 rounded-lg border border-border object-contain"
            />
          )}
          <p className="text-sm capitalize text-muted">{progress.status || 'Preparing…'}</p>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full bg-neon transition-all"
              style={{ width: `${Math.max(5, pct)}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-muted">{pct}% — reading the text…</p>
        </div>
      )}

      {stage === 'review' && (
        <div>
          <div className="grid gap-4 sm:grid-cols-2">
            {imageUrl && (
              <img
                src={imageUrl}
                alt="recipe"
                className="max-h-72 rounded-lg border border-border object-contain"
              />
            )}
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">
                Extracted text — fix anything OCR got wrong
              </p>
              <textarea
                className={`${inputClass} min-h-[220px] font-mono text-xs`}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </div>
          </div>
          <p className="mt-2 text-xs text-muted">
            Hint: putting an <code>Ingredients</code> line above the ingredients and a{' '}
            <code>Steps</code> line above the method helps it split into the right fields. You can
            also just tidy everything up in the next screen.
          </p>
          <div className="mt-4 flex justify-between gap-2 border-t border-border pt-4">
            <Button variant="ghost" onClick={reset}>
              ↺ Try another photo
            </Button>
            <Button variant="primary" disabled={!text.trim()} onClick={createRecipe}>
              Create recipe →
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
