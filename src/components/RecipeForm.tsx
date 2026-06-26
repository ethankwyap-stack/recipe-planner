import { useState } from 'react'
import type { Aisle, Ingredient, MealType, Recipe } from '../types'
import { AISLES } from '../types'
import { guessAisle, uniqueId } from '../lib/parse'
import { fileToStoredPhoto } from '../lib/image'
import { Button, Field, inputClass } from './ui'

const emptyIngredient = (): Ingredient => ({ item: '', qty: 0, unit: '', aisle: 'Other' })

export function RecipeForm({
  initial,
  existing,
  onSave,
  onCancel,
}: {
  initial?: Recipe
  existing: Recipe[]
  onSave: (r: Recipe) => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [servings, setServings] = useState(initial?.servings ?? 4)
  const [meal, setMeal] = useState<MealType[]>(initial?.meal ?? ['dinner'])
  const [prepTime, setPrepTime] = useState(initial?.prepTime ?? 0)
  const [cookTime, setCookTime] = useState(initial?.cookTime ?? 0)
  const [tags, setTags] = useState((initial?.tags ?? []).join(', '))
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [sourceUrl, setSourceUrl] = useState(initial?.sourceUrl ?? '')
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    initial?.ingredients?.length ? initial.ingredients : [emptyIngredient()],
  )
  const [steps, setSteps] = useState<string[]>(initial?.steps?.length ? initial.steps : [''])
  const [ingredientsPhoto, setIngredientsPhoto] = useState(initial?.ingredientsPhoto)
  const [instructionsPhoto, setInstructionsPhoto] = useState(initial?.instructionsPhoto)

  const toggleMeal = (m: MealType) =>
    setMeal((cur) => (cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m]))

  const setIng = (i: number, patch: Partial<Ingredient>) =>
    setIngredients((cur) => cur.map((ing, idx) => (idx === i ? { ...ing, ...patch } : ing)))

  const canSave = title.trim().length > 0 && meal.length > 0

  const handleSave = () => {
    const cleanIngredients = ingredients
      .map((ing) => ({ ...ing, item: ing.item.trim() }))
      .filter((ing) => ing.item)
    const cleanSteps = steps.map((s) => s.trim()).filter(Boolean)
    const recipe: Recipe = {
      id: initial?.id ?? uniqueId(title, existing),
      title: title.trim(),
      meal,
      servings: Math.max(1, servings),
      ingredients: cleanIngredients,
      steps: cleanSteps,
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      prepTime: prepTime || undefined,
      cookTime: cookTime || undefined,
      notes: notes.trim() || undefined,
      sourceUrl: sourceUrl.trim() || undefined,
      image: initial?.image,
      ingredientsPhoto,
      instructionsPhoto,
    }
    onSave(recipe)
  }

  return (
    <div className="space-y-4">
      <Field label="Title">
        <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Serves">
          <input
            type="number"
            min={1}
            className={inputClass}
            value={servings}
            onChange={(e) => setServings(Number(e.target.value))}
          />
        </Field>
        <Field label="Prep (min)">
          <input
            type="number"
            min={0}
            className={inputClass}
            value={prepTime}
            onChange={(e) => setPrepTime(Number(e.target.value))}
          />
        </Field>
        <Field label="Cook (min)">
          <input
            type="number"
            min={0}
            className={inputClass}
            value={cookTime}
            onChange={(e) => setCookTime(Number(e.target.value))}
          />
        </Field>
        <Field label="Meal">
          <div className="flex gap-1.5 pt-1">
            {(['lunch', 'dinner'] as MealType[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => toggleMeal(m)}
                className={`rounded-lg border px-2.5 py-1.5 text-xs capitalize ${
                  meal.includes(m)
                    ? 'border-neon/50 bg-neon/15 text-neon'
                    : 'border-border text-muted'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </Field>
      </div>

      <Field label="Tags" hint="Comma-separated — e.g. vegetarian, gluten-free, quick">
        <input className={inputClass} value={tags} onChange={(e) => setTags(e.target.value)} />
      </Field>

      {/* Ingredients editor */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">
            Ingredients
          </span>
        </div>
        <div className="space-y-2">
          {ingredients.map((ing, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <input
                className={`${inputClass} min-w-0 flex-1`}
                placeholder="item"
                value={ing.item}
                onChange={(e) => setIng(i, { item: e.target.value, aisle: guessAisle(e.target.value) })}
              />
              <input
                type="number"
                className={`${inputClass} w-16`}
                placeholder="qty"
                value={ing.qty || ''}
                onChange={(e) => setIng(i, { qty: Number(e.target.value) })}
              />
              <input
                className={`${inputClass} w-20`}
                placeholder="unit"
                value={ing.unit}
                onChange={(e) => setIng(i, { unit: e.target.value })}
              />
              <select
                className={`${inputClass} w-36`}
                value={ing.aisle}
                onChange={(e) => setIng(i, { aisle: e.target.value as Aisle })}
              >
                {AISLES.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setIngredients((cur) => cur.filter((_, idx) => idx !== i))}
                className="text-muted hover:text-red-300"
                aria-label="Remove ingredient"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <Button
          variant="ghost"
          className="mt-2"
          onClick={() => setIngredients((cur) => [...cur, emptyIngredient()])}
        >
          + Add ingredient
        </Button>
        <PhotoAttach
          label="ingredients"
          photo={ingredientsPhoto}
          onChange={setIngredientsPhoto}
        />
      </div>

      {/* Steps editor */}
      <div>
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">
          Steps
        </span>
        <div className="space-y-2">
          {steps.map((s, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="mt-2.5 text-xs text-muted">{i + 1}.</span>
              <textarea
                className={`${inputClass} min-h-[2.5rem] flex-1`}
                value={s}
                onChange={(e) =>
                  setSteps((cur) => cur.map((x, idx) => (idx === i ? e.target.value : x)))
                }
              />
              <button
                type="button"
                onClick={() => setSteps((cur) => cur.filter((_, idx) => idx !== i))}
                className="mt-2 text-muted hover:text-red-300"
                aria-label="Remove step"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <Button variant="ghost" className="mt-2" onClick={() => setSteps((cur) => [...cur, ''])}>
          + Add step
        </Button>
        <PhotoAttach
          label="instructions"
          photo={instructionsPhoto}
          onChange={setInstructionsPhoto}
        />
      </div>

      <Field label="Notes">
        <textarea
          className={`${inputClass} min-h-[3rem]`}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </Field>
      <Field label="Source URL">
        <input
          className={inputClass}
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
        />
      </Field>

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" disabled={!canSave} onClick={handleSave}>
          Save recipe
        </Button>
      </div>
    </div>
  )
}

function PhotoAttach({
  label,
  photo,
  onChange,
}: {
  label: string
  photo?: string
  onChange: (dataUrl: string | undefined) => void
}) {
  const [busy, setBusy] = useState(false)
  const handle = async (file: File) => {
    setBusy(true)
    try {
      onChange(await fileToStoredPhoto(file))
    } catch {
      /* ignore — user can retry */
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="mt-2 flex items-center gap-3">
      {photo && (
        <img src={photo} alt={`${label} photo`} className="h-14 w-14 rounded-lg border border-border object-cover" />
      )}
      <label className="inline-flex cursor-pointer items-center gap-1 text-xs text-muted hover:text-neon">
        {busy ? 'Attaching…' : photo ? `📷 Replace ${label} photo` : `📷 Attach ${label} photo`}
        <input
          type="file"
          accept="image/*,.heic,.heif"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handle(e.target.files[0])}
        />
      </label>
      {photo && (
        <button type="button" onClick={() => onChange(undefined)} className="text-xs text-muted hover:text-red-300">
          remove
        </button>
      )}
    </div>
  )
}
