import { useMemo, useState } from 'react'
import type { Recipe, WeekPlan } from '../types'
import { buildGroceryList, totalItems } from '../lib/grocery'
import { qtyLabel } from '../lib/units'
import { Button } from './ui'

export function GroceryList({ week, recipes }: { week: WeekPlan; recipes: Recipe[] }) {
  const sections = useMemo(() => buildGroceryList(week, recipes), [week, recipes])
  const [checked, setChecked] = useState<Set<string>>(new Set())

  const toggle = (key: string) =>
    setChecked((cur) => {
      const next = new Set(cur)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })

  const count = totalItems(sections)

  if (count === 0) {
    return (
      <p className="rounded-lg bg-surface-2 p-4 text-sm text-muted">
        Plan some meals and your shopping list will build itself here.
      </p>
    )
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between no-print">
        <p className="text-sm text-muted">
          {count} items · scaled for {week.householdServings}{' '}
          {week.householdServings === 1 ? 'serving' : 'servings'}
        </p>
        <Button variant="ghost" onClick={() => window.print()}>
          🖨 Print
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map((section) => (
          <div key={section.aisle} className="rounded-xl border border-border bg-surface p-3">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent">
              {section.aisle}
            </h4>
            <ul className="space-y-1">
              {section.lines.map((line) => {
                const key = `${section.aisle}:${line.item}:${line.unit}`
                const isChecked = checked.has(key)
                return (
                  <li key={key}>
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggle(key)}
                        className="accent-[var(--color-neon)]"
                      />
                      <span className={isChecked ? 'text-muted line-through' : ''}>
                        {line.item}
                      </span>
                      <span className="ml-auto text-xs text-muted">
                        {qtyLabel(line.qty, line.unit)}
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
