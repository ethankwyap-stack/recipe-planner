import { useMemo, useState } from 'react'
import type { MealType, Recipe } from '../types'
import { Badge, Modal, inputClass } from './ui'

export function RecipePicker({
  open,
  onClose,
  recipes,
  meal,
  onSelect,
}: {
  open: boolean
  onClose: () => void
  recipes: Recipe[]
  meal: MealType | null
  onSelect: (recipeId: string) => void
}) {
  const [q, setQ] = useState('')

  const list = useMemo(() => {
    const term = q.trim().toLowerCase()
    return recipes
      .filter((r) => (meal ? r.meal.includes(meal) : true))
      .filter(
        (r) =>
          !term ||
          r.title.toLowerCase().includes(term) ||
          r.tags.some((t) => t.toLowerCase().includes(term)),
      )
  }, [recipes, meal, q])

  return (
    <Modal open={open} onClose={onClose} title={`Pick a ${meal ?? 'recipe'}`}>
      <input
        autoFocus
        className={inputClass}
        placeholder="Search recipes or tags…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="mt-3 max-h-[50vh] space-y-2 overflow-y-auto pr-1">
        {list.length === 0 && <p className="text-sm text-muted">No matching recipes.</p>}
        {list.map((r) => (
          <button
            key={r.id}
            onClick={() => {
              onSelect(r.id)
              setQ('')
              onClose()
            }}
            className="flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-surface-2 px-3 py-2 text-left hover:border-neon/50"
          >
            <span className="text-sm font-medium">{r.title}</span>
            <span className="flex flex-wrap justify-end gap-1">
              {r.tags.slice(0, 2).map((t) => (
                <Badge key={t}>{t}</Badge>
              ))}
            </span>
          </button>
        ))}
      </div>
    </Modal>
  )
}
