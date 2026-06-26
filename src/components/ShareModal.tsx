import { useMemo, useState } from 'react'
import type { Recipe, SharedPlan, WeekPlan } from '../types'
import { buildShareUrl } from '../lib/share'
import { Button, Field, Modal, inputClass } from './ui'

export function ShareModal({
  open,
  onClose,
  week,
  recipes,
}: {
  open: boolean
  onClose: () => void
  week: WeekPlan
  recipes: Recipe[]
}) {
  const [title, setTitle] = useState('')
  const [copied, setCopied] = useState(false)

  // Only embed the recipes actually used in the plan, so the link stays small.
  const url = useMemo(() => {
    const usedIds = new Set(
      week.days.flatMap((d) => [d.lunchRecipeId, d.dinnerRecipeId]).filter(Boolean) as string[],
    )
    // Strip attached photos — they'd bloat the URL past usable limits. The shared
    // plan keeps all the text (ingredients, steps); only the optional images drop.
    const usedRecipes = recipes
      .filter((r) => usedIds.has(r.id))
      .map(
        ({
          ingredientsPhotos: _ip,
          instructionsPhotos: _sp,
          ingredientsPhoto: _i,
          instructionsPhoto: _s,
          image: _img,
          ...rest
        }) => rest,
      )
    const shared: SharedPlan = { v: 1, plan: week, recipes: usedRecipes, title: title.trim() || undefined }
    return buildShareUrl(shared)
  }, [week, recipes, title])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      /* clipboard blocked — the user can still select the text */
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  const isEmpty = week.days.every((d) => !d.lunchRecipeId && !d.dinnerRecipeId)

  return (
    <Modal open={open} onClose={onClose} title="Share this meal plan">
      {isEmpty ? (
        <p className="text-sm text-muted">Add some meals first, then share.</p>
      ) : (
        <>
          <p className="text-sm text-muted">
            This link contains the whole plan, its grocery list, and the recipes used — anyone can
            open it, no login. It works even if they don't have your recipe library.
          </p>
          <Field label="Name this plan (optional)">
            <input
              className={inputClass}
              placeholder="e.g. Ethan's high-protein week"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>
          <div className="mt-3 flex items-center gap-2">
            <input readOnly value={url} className={`${inputClass} text-xs`} onFocus={(e) => e.target.select()} />
            <Button variant="primary" onClick={copy}>
              {copied ? '✓ Copied' : 'Copy link'}
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted">
            Tip: paste it into a message, or use 🖨 Print on the grocery list for a paper copy.
          </p>
        </>
      )}
    </Modal>
  )
}
